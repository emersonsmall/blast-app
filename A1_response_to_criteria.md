Assignment 1 - REST API Project - Response to Criteria
================================================

Overview
------------------------------------------------

- **Name:** Emerson Small
- **Student number:** n10763139
- **Application name:** BLAST App
- **Two line description:** Takes the names of two organisms, retrieves
the relevant FASTA (sequence content) and GFF (genome annotation) files using the
GenBank API, and runs an all-vs-all BLAST (Basic Local Alignment Search Tool) search 
to find the most similar gene of the two given species.


Core criteria
------------------------------------------------

### Containerise the app

- **ECR Repository name:** n10763139-a1-repo
- **Video timestamp:** 00:47
- **Relevant files:**
    docker-compose.yml
    Dockerfile

### Deploy the container
- **EC2 instance ID:** i-01d126ae83cc1ce0a
- **Video timestamp:** 01:10

### User login

- **One line description:** JWT authentication with admin and standard user roles. Admins can see all jobs, users, and genomes but 
standard users can only see their own jobs and genomes.
Users seeded in dbInit.js
- **Video timestamp:** 01:20
- **Relevant files:**
    src/middleware/authMiddleware.js
    src/routes/api/v1/auth.js
    src/controllers/authController.js
    src/config/dbInit.js

### REST API

- **One line description:** Endpoints for all resources: /users /jobs /genomes /auth with 
CRUD operations implemented for POST, GET, PUT, and DELETE requests as relevant.
- **Video timestamp:** 04:10
- **Relevant files:**
    src/controllers/*
    src/models/*
    src/routes/*

### Data types

#### First kind

- **One line description:** FASTA and GFF files that store genomic information as text files.
- **Type:** Unstructured data
- **Rationale:** Required as input for BLAST tools
- **Video timestamp:** 02:00
- **Relevant files:**
    src/services/jobService.js

#### Second kind

- **One line description:** Metadata about BLAST jobs and genomes stored in mariadb database.
- **Type:** Structured data with no ACID requirements
- **Rationale:** Job results, job statuses, and genome metadata are required to be queryable, but simultaneous writes are unlikely
as each job is independent. Mariadb chosen for simplicity.
- **Video timestamp:** 3:15
- **Relevant files:**
    src/models/*
    src/config/dbInit.js

### CPU intensive task

 **One line description:** BLAST all-vs-all search using the ncbi-blast+ package.
- **Video timestamp:** 02:40
- **Relevant files:**
    scripts/blast_workflow.py
    scripts/requirements.txt


### CPU load testing

 **One line description:** Manual requests generated using Hoppscotch with btop++ used to examine CPU load.
- **Video timestamp:** 01:25
- **Relevant files:**
    - 

Additional criteria
------------------------------------------------

### Extensive REST API features

- **One line description:** Versioning, sorting, filtering, and pagination implemented on all relevant endpoints.
- **Video timestamp:** 03:20
- **Relevant files:**
    src/models/*
    src/routes/api/v1/*
    src/controllers/*

### External API(s)

- **One line description:** 2 GenBank API endpoints are used to retrieve the accession IDs and 
genome files of the given organisms. The common name or scientific name can be given, and the API
returns the closest match if incomplete/malformed names are given.
- **Video timestamp:** 01:45
- **Relevant files:**
    src/services/jobService.js

### Additional types of data

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Custom processing

- **One line description:** Custom code used in blast_workflow.py script to extract relevant coding sequences (CDS)
from raw .fna fasta files and translate them to amino acid sequences (.faa file). These sequences are then passed to blastx tool. 
Custom code also used to handle this subprocess from the Node runtime.
- **Video timestamp:** 02:20
- **Relevant files:**
    scripts/blast_workflow.py
    src/services/jobService.js

### Infrastructure as code

- **One line description:** Docker compose used to automatically deploy 2 containers: node app and mariadb database.
- **Video timestamp:** 00:55
- **Relevant files:**
    docker-compose.yml

### Upon request

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 
