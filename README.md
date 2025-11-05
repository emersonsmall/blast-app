# BLAST App

This repo was the final assignment for a cloud computing subject I completed. Manual setup of various AWS services is required, so it is not fully functional on its own.

It allows users to perform a BLAST search between two organisms. It retrieves the necessary FASTA and GFF files from the NCBI Datasets API and runs an all-vs-all BLAST search to identify the most similar gene between the two species.

## Architecture

The application is containerised and consists of a server and a worker, as defined in `docker-compose.yml`.

  * **Server**: An Express.js application that provides the API endpoints.
  * **Worker**: A Node.js application that processes BLAST jobs asynchronously via a Python script.

### AWS Services

The application is designed for AWS and utilises serveral services:

  * **S3**: Stores genome files (.GFF and .FASTA).
  * **RDS**: Stores genome and BLAST job metadata.
  * **SQS**: Passes job information from the server to the worker.
  * **ECS**
  * **Route53**
  * **Parameter Store**
  * **Secrets Manager**
  * **Cognito**

## Features

  * User registration and login.
  * Create and manage BLAST jobs.
  * Admin and user roles with different permissions.
  * API supports sorting, pagination, and filtering for relevant endpoints.

## API Endpoints

All endpoints are available under `/api/v1`.

### Sorting, Pagination, and Filtering

The API supports sorting, pagination, and filtering on the `/jobs` and `/genomes` endpoints. These are passed as query parameters in the request URL.

  * `sortBy`: The field to sort by (e.g., `createdAt`).
  * `sortOrder`: The order to sort by (`asc` or `desc`).
  * `page`: The page number for pagination.
  * `limit`: The number of items per page.
  * Other query parameters are treated as filters (e.g., `status=completed`).

### Authentication

  * `POST /auth/register`: Register a new user.
  * `POST /auth/confirm`: Confirm a new user's account.
  * `POST /auth/login`: Log in a user and receive a JWT.

### Jobs

  * `POST /jobs`: Create a new BLAST job.
  * `GET /jobs`: Get all jobs for the authenticated user.
  * `GET /jobs/:id`: Get a job by its ID.
  * `DELETE /jobs/:id`: Delete a job by its ID.
  * `GET /jobs/:id/result`: Get the result of a job.

### Genomes

  * `GET /genomes`: Get all genomes. Behavior varies based on user role.
  * `GET /genomes/:id`: Get a single genome by its ID.

### Users

  * `GET /users`: Get all users (Admin only).
  * `GET /users/:id`: Get a user by their ID.
  * `DELETE /users/:id`: Delete a user by their ID (Admin only).

## API Endpoint Tests

Tests covering the authentication, jobs, genomes, and users endpoints are included.

Test files are located in the `tests/` directory.
