import mongoose from "mongoose";

mongoose.set("strictQuery", false);

// Cache the connection PROMISE on `global` (Next.js official mongoose pattern):
// - concurrent cold requests share one dial instead of racing mongoose.connect
// - dev HMR re-evaluates this module; the global survives and we never re-dial
const cached = global._mongooseConn || (global._mongooseConn = { promise: null });

const dbConnect = async () => {
	if (mongoose.connection.readyState >= 1) {
		return;
	}
	if (!cached.promise) {
		cached.promise = mongoose
			.connect(process.env.MONGODB_URI)
			.then((conn) => {
				console.log("Connected to MongoDB");
				return conn;
			})
			.catch((error) => {
				// Reset so the next request retries; throw so a transient DB
				// outage fails the request, not the whole server.
				cached.promise = null;
				console.error("DB Connection Error:", error);
				throw error;
			});
	}
	await cached.promise;
};

export default dbConnect;
