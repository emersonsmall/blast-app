Assignment 2 - Cloud Services Exercises - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed


Overview
------------------------------------------------

- **Name:** Emerson Small
- **Student number:** n10763139
- **Partner name (if applicable):** N/A
- **Application name:** BLAST App
- **Two line description:** 
- **EC2 instance name or ID:**

------------------------------------------------

### Core - First data persistence service

- **AWS service name:** S3
- **What data is being stored?:** Genome files (.GFF and .FASTA)
- **Why is this service suited to this data?:** [eg. large files are best suited to blob storage due to size restrictions on other services]
- **Why is are the other services used not suitable for this data?:**
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### Core - Second data persistence service

- **AWS service name:** RDS
- **What data is being stored?:** Genome and BLAST job metadata
- **Why is this service suited to this data?:**
- **Why is are the other services used not suitable for this data?:**
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### Third data service

- **AWS service name:** N/A
- **What data is being stored?:**
- **Why is this service suited to this data?:**
- **Why is are the other services used not suitable for this data?:**
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### S3 Pre-signed URLs

- **S3 Bucket names:**
- **Video timestamp:**
- **Relevant files:**
    -

### In-memory cache

- **ElastiCache instance name:**
- **What data is being cached?:** 
- **Why is this data likely to be accessed frequently?:**
- **Video timestamp:**
- **Relevant files:**
    -

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** [eg. intermediate video files that have been transcoded but not stabilised]
- **Why is this data not considered persistent state?:** [eg. intermediate files can be recreated from source if they are lost]
- **How does your application ensure data consistency if the app suddenly stops?:** [eg. journal used to record data transactions before they are done.  A separate task scans the journal and corrects problems on startup and once every 5 minutes afterwards. ]
- **Relevant files:**
    -

### Graceful handling of persistent connections

- **Type of persistent connection and use:**
- **Method for handling lost connections:**
- **Relevant files:**
    -


### Core - Authentication with Cognito

- **User pool name:**
- **How are authentication tokens handled by the client?:** [eg. Response to login request sets a cookie containing the token.]
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito multi-factor authentication

- **What factors are used for authentication:** [eg. password, SMS code]
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito federated identities

- **Identity providers used:**
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito groups

- **How are groups used to set permissions?:** [eg. 'admin' users can delete and ban other users]
- **Video timestamp:**
- **Relevant files:**
    -

### Core - DNS with Route53

- **Subdomain**:  [eg. myawesomeapp.cab432.com]
- **Video timestamp:**

### Parameter store

- **Parameter names:** [eg. n1234567/base_url]
- **Video timestamp:**
- **Relevant files:**
    -

### Secrets manager

- **Secrets names:** [eg. n1234567-youtube-api-key]
- **Video timestamp:**
- **Relevant files:**
    -

### Infrastructure as code

- **Technology used:**
- **Services deployed:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -
