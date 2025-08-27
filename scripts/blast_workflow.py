import sys
import json
import subprocess
import os
import textwrap

import gffutils
import pyfaidx
from Bio.Blast import NCBIXML
from Bio import SeqIO

# TODO: don't delete extracted CDS sequences after BLAST. relocate to data/accession ID directory or database. 
# check if cds files already exist before extracting them again

# TODO: add useful files/output to db/s3 and use for subsequent jobs if possible

# Pipeline:
# 1. Extract nucleotide CDS sequences from query and target
# 2. Translate target to protein (blastx does this internally for query)
# 3. Run blastx to search query against target
# 4. Parse results and return top hit

def extract_cds(fasta_path, gff_path, out_path, job_id):
    """Extracts all CDS features from a genome and writes them to a FASTA file."""
    try:
        db = gffutils.create_db(
            gff_path,
            dbfn=':memory:',
            force=True,
            keep_order=True,
            merge_strategy='create_unique',
        )

        genome = pyfaidx.Fasta(fasta_path)
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

            fasta_entries.append(f">{feature["ID"][0]}\n{wrapped_seq}\n")

        if not fasta_entries:
            raise RuntimeError("No mRNA features with CDS children found in GFF file.")

        print(f"Job {job_id}: Extracted {len(fasta_entries)} CDS sequences", file=sys.stderr)

        with open(out_path, "w") as out_fh:
            out_fh.writelines(fasta_entries)

    except Exception as e:
        raise RuntimeError(f"Failed to extract CDS: {e}")


def translate_cds_to_prot(nt_fasta_path, out_fpath, job_id):
    """Translates a nucleotide FASTA file to a protein FASTA file."""
    try:
        protein_entries = []
        for record in SeqIO.parse(nt_fasta_path, "fasta"):
            protein_seq = record.seq.translate(to_stop=True)

            wrapped_seq = textwrap.wrap(str(protein_seq), 80)
            wrapped_seq = "\n".join(wrapped_seq)
            protein_entries.append(f">{record.id}\n{wrapped_seq}\n")
        
        with open(out_fpath, "w") as out_fh:
            out_fh.writelines(protein_entries)

    except Exception as e:
        raise RuntimeError(f"Failed to translate nucleotide FASTA: {e}")


def run_blastx(query_nt_path, target_prot_path, job_id, db_name, blast_results_xml):
    """Searches a nucleotide query against a protein database using blastx."""
    db_name = f"{job_id}_target_db"
    blast_results_xml = f"{job_id}_blast_results.xml"

    try:
        print(f"Job {job_id}: Creating BLAST protein database", file=sys.stderr)
        subprocess.run([
            "makeblastdb",
            "-in", target_prot_path,
            "-dbtype", "prot",
            "-out", db_name
        ], check=True, capture_output=True, text=True)

        num_threads = os.cpu_count()
        print(f"Job {job_id}: Running blastx with {num_threads} threads", file=sys.stderr)
        subprocess.run([
            "blastx",
            "-query", query_nt_path,
            "-db", db_name,
            "-out", blast_results_xml,
            "-outfmt", "5",
            "-num_threads", str(num_threads),
        ], check=True, capture_output=True, text=True)
    
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"BLAST command failed with exit code {e.returncode}: {e.stderr}")
    
    print(f"Job {job_id}: Parsing BLAST results", file=sys.stderr)
    top_hit = None
    lowest_e_value = float('inf')
    with open(blast_results_xml) as results_fh:
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

    return {"top_hit": top_hit}


if __name__ == "__main__":
    query_fasta, query_gff, target_fasta, target_gff, job_id = sys.argv[1:6]

    query_nt_out = f"{job_id}_query_cds.fna"
    target_nt_out = f"{job_id}_target_cds.fna"
    target_prot_out = f"{job_id}_target_proteins.faa"
    db_name = f"{job_id}_target_db"
    blast_results_xml = f"{job_id}_blast_results.xml"

    try:
        print(f"Job {job_id}: Extracting CDS for {os.path.basename(query_fasta)}", file=sys.stderr)
        extract_cds(query_fasta, query_gff, query_nt_out, job_id)
        print(f"Job {job_id}: Extracting CDS for {os.path.basename(target_fasta)}", file=sys.stderr)
        extract_cds(target_fasta, target_gff, target_nt_out, job_id)

        print(f"Job {job_id}: Translating nucleotide FASTA to protein FASTA", file=sys.stderr)
        translate_cds_to_prot(target_nt_out, target_prot_out, job_id)

        results = run_blastx(query_nt_out, target_prot_out, job_id, db_name, blast_results_xml)

        print(json.dumps(results))
    
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    
    finally:
        # cleanup
        temp_file_exts = ["phr", "pin", "psq", "pdb", "pjs", "pot", "ptf", "pto"]
        files_to_remove = [
            query_nt_out,
            target_nt_out,
            target_prot_out,
            blast_results_xml,
        ]
        files_to_remove += [f"{db_name}.{ext}" for ext in temp_file_exts]
        for f in files_to_remove:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as e:
                print(f"Warning: Failed to remove temporary file {f}: {e}", file=sys.stderr)
