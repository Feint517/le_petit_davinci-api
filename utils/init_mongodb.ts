import mongoose from 'mongoose';

/**
 * Initialize MongoDB connection using Mongoose
 */
const initMongoDB = async (): Promise<void> => {
    try {
        const mongoUri: string = process.env.MONGODB_URI_ATLAS as string;
        const dbName: string = process.env.DB_NAME as string;
        
        if (!mongoUri || !dbName) {
            throw new Error('MongoDB URI or database name not provided in environment variables');
        }

        await mongoose.connect(mongoUri, { dbName });
        console.log('mongoose connected');
    } catch (err: any) {
        console.log('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

// Connection event listeners
mongoose.connection.on('connected', (): void => {
    console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err: Error): void => {
    console.log('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', (): void => {
    console.log('mongoose disconnected');
});

// Close connection to DB when the app is closed
process.on('SIGINT', async (): Promise<void> => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
});

export default initMongoDB;
