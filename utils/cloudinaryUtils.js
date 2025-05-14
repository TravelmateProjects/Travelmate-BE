const cloudinary = require('../configs/cloudinary');

exports.uploadFilesToCloudinary = async (files, folder, resourceType = 'image') => {
    const maxRetries = 3;
    return Promise.all(files.map(async (file) => {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({
                        folder,
                        resource_type: resourceType,
                        timeout: 120000, // Set timeout to 120 seconds
                    }, (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    });
                    uploadStream.end(file.buffer);
                });
                return {
                    url: result.secure_url,
                    publicId: result.public_id,
                    uploadedAt: new Date(),
                };
            } catch (error) {
                console.error(`Error uploading file to ${folder} (attempt ${attempt + 1}):`, error);
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error(`${resourceType} upload failed after multiple attempts`);
                }
            }
        }
    }));
};
