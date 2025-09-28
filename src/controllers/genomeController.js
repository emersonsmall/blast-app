const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

const { config } = require("../config");
const { getS3Client } = require("../config/s3");
const genomeModel = require("../models/genomeModel");

/**
 * @route GET /api/v1/genomes
 * @desc Get all genomes in the database
 * @access Private (Admin for all, any authenticated user for their own)
 */
exports.getAllGenomes = async (req, res) => {
    try {
        const { userId } = req.query;
        const authenticatedUser = req.user;
        
        // If a userId is provided, ensure the requester is either admin or the user themselves
        if (userId && !authenticatedUser.isAdmin && authenticatedUser.id !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const { sortBy, sortOrder, page, limit, ...filters } = req.query;

        const queryOptions = {
            filters,
            pagination: { page, limit },
            sorting: { sortBy, sortOrder }
        };

        let result;
        if (userId) {
            result = await genomeModel.getUniqueGenomesByUserId(userId, queryOptions);
        } else if (!authenticatedUser.isAdmin) {
            result = await genomeModel.getUniqueGenomesByUserId(authenticatedUser.id, queryOptions);
        } else {
            result = await genomeModel.find(queryOptions);
        }
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching genomes:", err);
        res.status(500).json({ error: "Error fetching genomes" });
    }
};

/**
 * @route GET /api/v1/genomes/:id
 * @desc Get a single genome by its ID and provide pre-signed download URLs.
 * @access Private
 */
exports.getGenomeById = async (req, res) => {
    try {
        const { id } = req.params;
        const genome = await genomeModel.getById(id);

        if (!genome) {
            return res.status(404).json({ error: "Genome not found." });
        }

        let s3Client = getS3Client();
        // Construct the S3 keys for the genome's files
        const fastaKey = `${id}/${id}.fna`;
        const gffKey = `${id}/${id}.gff`;

        // Generate pre-signed URLs for both files
        const s3Config = { Bucket: config.aws.s3BucketName, Key: fastaKey };
        const fastaUrl = await getSignedUrl(s3Client, new GetObjectCommand(s3Config), { expiresIn: 3600 });
        
        s3Config.Key = gffKey;
        const gffUrl = await getSignedUrl(s3Client, new GetObjectCommand(s3Config), { expiresIn: 3600 });
        
        // Add the download links to the response object
        const response = {
            ...genome,
            downloads: {
                fasta: fastaUrl,
                gff: gffUrl
            }
        };

        res.status(200).json(response);

    } catch (err) {
        console.error("Error fetching genome by ID:", err);
        res.status(500).json({ error: "Error fetching genome" });
    }
};