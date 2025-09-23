import sys
import json
import subprocess
import os
import textwrap
import requests

import gffutils
import pyfaidx
from Bio.Blast import NCBIXML
from Bio import SeqIO

# Pipeline:
# 1. Extract nucleotide CDS sequences from query and target genomes
# 2. Translate target CDS to proteins (blastx does this internally for query)
# 3. Run blastx to search query against target
# 4. Parse results and return top hit

def download_from_url(url, local_fpath):
    """Downloads a file from a URL to a local path."""
    try:
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(local_fpath, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
    except Exception as e:
        raise RuntimeError(f"Failed to download {url}: {e}")


def extract_cds(fasta_fpath, gff_fpath, out_fpath, job_id):
    """Extracts all CDS features from a genome and writes them to a FASTA file."""
    try:
        print(f"Job {job_id}: Extracting CDS from {fasta_fpath}", file=sys.stderr)
        
        print(f"Job {job_id}: Loading GFF file {gff_fpath}", file=sys.stderr)
        db = gffutils.create_db(
            gff_fpath,
            dbfn=':memory:',
            force=True,
            keep_order=True,
            merge_strategy='create_unique',
        )

        genome = pyfaidx.Fasta(fasta_fpath)
        fasta_entries = []

        parent_feature_type = "mRNA"
        if not any(db.features_of_type(parent_feature_type)):
            print(f"Job {job_id}: No mRNA features found, trying 'gene' as parent feature type", file=sys.stderr)
            parent_feature_type = "gene"

        for feature in db.features_of_type(parent_feature_type):
            cds_segments = list(db.children(feature, featuretype="CDS", order_by="start"))

            if not cds_segments:
                continue

            full_cds = "".join([segment.sequence(genome) for segment in cds_segments])

            wrapped_seq = textwrap.wrap(full_cds, 80)
            wrapped_seq = "\n".join(wrapped_seq)

            fasta_entries.append(f">{feature['ID'][0]}\n{wrapped_seq}\n")

        if not fasta_entries:
            raise RuntimeError("No mRNA features with CDS children found in GFF file.")

        print(f"Job {job_id}: Extracted {len(fasta_entries)} CDS sequences", file=sys.stderr)

        with open(out_fpath, "w") as out_fh:
            out_fh.writelines(fasta_entries)

    except Exception as e:
        raise RuntimeError(f"Failed to extract CDS: {e}")


def nt_to_prot(nt_fasta_fpath, out_fpath):
    """Translates a nucleotide FASTA file to a protein FASTA file."""
    try:
        protein_entries = []
        for record in SeqIO.parse(nt_fasta_fpath, "fasta"):
            protein_seq = record.seq.translate(to_stop=True)

            wrapped_seq = textwrap.wrap(str(protein_seq), 80)
            wrapped_seq = "\n".join(wrapped_seq)
            protein_entries.append(f">{record.id}\n{wrapped_seq}\n")
        
        with open(out_fpath, "w") as out_fh:
            out_fh.writelines(protein_entries)

    except Exception as e:
        raise RuntimeError(f"Failed to translate nucleotide FASTA: {e}")


def run_blastx(query_nt_fpath, target_prot_fpath, job_id):
    """Searches a nucleotide query against a protein database using blastx."""
    db_name = f"{job_id}_target_db"
    out_fname = f"{job_id}_results.xml"

    try:
        print(f"Job {job_id}: Creating BLAST protein database", file=sys.stderr)
        subprocess.run([
            "makeblastdb",
            "-in", target_prot_fpath,
            "-dbtype", "prot",
            "-out", db_name
        ], check=True, capture_output=True, text=True)

        num_threads = os.cpu_count()
        print(f"Job {job_id}: Running blastx", file=sys.stderr)
        subprocess.run([
            "blastx",
            "-query", query_nt_fpath,
            "-db", db_name,
            "-out", out_fname,
            "-outfmt", "5",
            "-num_threads", str(num_threads),
        ], check=True, capture_output=True, text=True)
    
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"BLAST command failed with exit code {e.returncode}: {e.stderr}")
    
    print(f"Job {job_id}: Parsing BLAST results", file=sys.stderr)
    top_hit = None
    lowest_e_value = float('inf')
    with open(out_fname) as results_fh:
        for blast_record in NCBIXML.parse(results_fh):
            if len(blast_record.alignments) > 0:
                curr_top_alignment = blast_record.alignments[0]
                curr_top_hsp = curr_top_alignment.hsps[0]

                if curr_top_hsp.expect < lowest_e_value:
                    lowest_e_value = curr_top_hsp.expect
                    top_hit = {
                        "query_id": blast_record.query.split(' ')[0],
                        "hit_title": curr_top_alignment.title,
                        "e_value": curr_top_hsp.expect,
                        "score": curr_top_hsp.score,
                        "identity_percent": round((curr_top_hsp.identities / curr_top_hsp.align_length) * 100, 2),
                    }

    return {"top_hit": top_hit, "db_name": db_name, "results_fpath": out_fname}


def main() -> int:
    query_fasta_url, query_gff_url, target_fasta_url, target_gff_url, job_id = sys.argv[1:6]

    query_fasta = f"{job_id}_query.fna"
    query_gff = f"{job_id}_query.gff"
    target_fasta = f"{job_id}_target.fna"
    target_gff = f"{job_id}_target.gff"

    query_cds = f"{job_id}_query_cds.fna"
    target_cds = f"{job_id}_target_cds.fna"
    target_cds_prot = f"{job_id}_target_cds.faa"

    results = None

    try:
        print(f"Job {job_id}: Downloading files from pre-signed URLs", file=sys.stderr)
        download_from_url(query_fasta_url, query_fasta)
        download_from_url(query_gff_url, query_gff)
        download_from_url(target_fasta_url, target_fasta)
        download_from_url(target_gff_url, target_gff)

        extract_cds(query_fasta, query_gff, query_cds, job_id)
        extract_cds(target_fasta, target_gff, target_cds, job_id)

        print(f"Job {job_id}: Translating nucleotides to proteins", file=sys.stderr)
        nt_to_prot(target_cds, target_cds_prot)

        results = run_blastx(query_cds, target_cds_prot, job_id)
        print(results, file=sys.stderr)
        print(json.dumps(results["top_hit"]))
    
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return 1
    
    finally:
        # cleanup
        files_to_remove = [
            query_fasta, query_gff, target_fasta,
            target_gff, query_cds, target_cds, target_cds_prot,
            query_fasta + ".fai", target_fasta + ".fai"
        ]

        if results:
            files_to_remove.append(results["results_fpath"])
            db_name = results["db_name"]
            temp_file_exts = ["phr", "pin", "psq", "pdb", "pjs", "pot", "ptf", "pto"]
            files_to_remove.extend([f"{db_name}.{ext}" for ext in temp_file_exts])

        for f in files_to_remove:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as e:
                print(f"Warning: Failed to remove temporary file {f}: {e}", file=sys.stderr)
        
        return 0


if __name__ == "__main__":
    sys.exit(main())
