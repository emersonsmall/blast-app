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
to find the most similar gene of the two species.


Core criteria
------------------------------------------------

### Containerise the app

- **ECR Repository name:** n10763139-a1-repo
- **Video timestamp:**
- **Relevant files:**
    docker-compose.yml
    Dockerfile

### Deploy the container
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com
- **EC2 instance ID:** i-01d126ae83cc1ce0a
- **Video timestamp:**

### User login

- **One line description:** JWT authentication with admin and standard user roles. Admins can see all jobs, users, and genomes but 
standard users can only see their own jobs and genomes.
- **Video timestamp:**
- **Relevant files:**
    src/middleware/authMiddleware.js
    src/routes/api/v1/auth.js
    src/controllers/authController.js

### REST API

- **One line description:** Endpoints for all resources /users /jobs /genomes /auth
- **Video timestamp:**
- **Relevant files:**
    src/controllers/*
    src/models/*
    src/routes/*

### Data types

- **One line description:** Unstructured data and metadata about this unstructured data and its processing.
- **Video timestamp:**
- **Relevant files:**
    src/config/dbInit.js

#### First kind

- **One line description:** FASTA and GFF files that store genomic information as text.
- **Type:** Unstructured data
- **Rationale:** Required as input for BLAST tools
- **Video timestamp:** 
- **Relevant files:**
    src/services/jobService.js

#### Second kind

- **One line description:** Metadata about BLAST jobs and genomes.
- **Type:** Structured data
- **Rationale:** Stores job results, current job status, and can be used to compare multiple analyses
- **Video timestamp:**
- **Relevant files:**
    src/services/jobService.js
    src/models/*
    src/config/dbInit.js

### CPU intensive task

 **One line description:** BLAST all-vs-all search using the ncbi-blast+ package.
- **Video timestamp:** 
- **Relevant files:**
    scripts/blast_workflow.py
    scripts/requirements.txt


### CPU load testing

 **One line description:** Manual requests generated using Hoppscotch with btop++ used to examine CPU load.
- **Video timestamp:** 
- **Relevant files:**
    - 

Additional criteria
------------------------------------------------

### Extensive REST API features

- **One line description:** Versioning, sorting, filtering, and pagination implemented on all relevant endpoints.
- **Video timestamp:**
- **Relevant files:**
    src/models/*
    src/routes/api/v1/*
    src/controllers/*

### External API(s)

- **One line description:** 2 GenBank API endpoints are used to retrieve the accession IDs and 
genome files of the given organisms. The common name or scientific name can be given, and the API
returns the closest match if incomplete/malformed names are given.
- **Video timestamp:**
- **Relevant files:**
    src/services/jobService.js

### Additional types of data

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Custom processing

- **One line description:** Significant custom code used in blast_workflow.py script, 
and custom code used to handle this subprocess.
- **Video timestamp:**
- **Relevant files:**
    scripts/blast_workflow.py
    src/services/jobService.js

### Infrastructure as code

- **One line description:** Docker compose used to automatically deploy containers.
- **Video timestamp:**
- **Relevant files:**
    docker-compose.yml

### Upon request

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 
