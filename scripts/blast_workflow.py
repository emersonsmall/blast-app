import sys
import json
import subprocess
import os

# TODO: don't delete extracted CDS sequences after BLAST - keep them for future use. relocate to data/accession ID directory
# TODO: check if cds files already exist before extracting them again

def extract_cds_with_gffread(fasta_path, gff_path, out_path, job_id):
    """Extracts all CDS features from a genome and writes them to a FASTA file."""
    print(f"Job {job_id}: Extracting CDS from {os.path.basename(gff_path)}...", file=sys.stderr)
    
    command = [
        "gffread",
        "-g", fasta_path,
        "-x", out_path,
        gff_path
    ]

    try:
        subprocess.run(command, check=True, capture_output=True, text=True)

        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            raise RuntimeError(f"Failed to extract CDS from {gff_path}. Output file is empty or does not exist.")
        
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"gffread failed with exit code {e.returncode}: {e.stderr}")
    except FileNotFoundError:
        raise RuntimeError(f"gffread command not found. Please ensure it is installed and in your PATH.")


def run_blast(query_cds_path, target_cds_path, job_id):
    """Runs a BLAST search and returns the top hit."""
    db_name = f"{job_id}_target_db"
    blast_results_xml = f"{job_id}_blast_results.xml"

    try:
        # Create BLAST database
        print(f"Job {job_id}: Creating BLAST database...", file=sys.stderr)
        subprocess.run([
            "makeblastdb",
            "-in", target_cds_path,
            "-dbtype", "prot",
            "-out", db_name
        ], check=True, capture_output=True, text=True)

        num_threads = os.cpu_count()

        # Run blastp search
        print(f"Job {job_id}: Running BLAST search...", file=sys.stderr)
        subprocess.run([
            "blastp",
            "-query", query_cds_path,
            "-db", db_name,
            "-out", blast_results_xml,
            "-outfmt", "5",
            "-num_threads", str(num_threads),
        ], check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"BLAST command failed with exit code {e.returncode}: {e.stderr}")
    
    from Bio.Blast import NCBIXML
    top_hit = None
    with open(blast_results_xml) as result_handle:
        blast_record = NCBIXML.read(result_handle)
        if len(blast_record.alignments) > 0:
            alignment = blast_record.alignments[0]
            hsp = alignment.hsps[0]
            top_hit = {
                "hit_title": alignment.title,
                "e_value": hsp.expect,
                "score": hsp.score,
                "identity_percent": round((hsp.identities / hsp.align_length) * 100, 2),
            }
    
    # cleanup
    for ext in [".phr", ".pin", ".psq"]:
        os.remove(f"{db_name}{ext}")
    os.remove(blast_results_xml)

    return {"top_hit": top_hit, "job_id": job_id}


if __name__ == "__main__":
    query_fasta, query_gff, target_fasta, target_gff, job_id = sys.argv[1:6]

    query_cds_out = f"{job_id}_query_cds.fna"
    target_cds_out = f"{job_id}_target_cds.fna"

    try:
        # extract_cds_with_gffread(query_fasta, query_gff, query_cds_out, job_id)
        # extract_cds_with_gffread(target_fasta, target_gff, target_cds_out, job_id)
        results = run_blast(query_cds_out, target_cds_out, job_id)

        # cleanup
        os.remove(query_cds_out)
        os.remove(target_cds_out)

        print(json.dumps(results))
    
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
