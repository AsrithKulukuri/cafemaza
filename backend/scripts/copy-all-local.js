import mongoose from "mongoose";

const SOURCE_URI = process.env.SOURCE_MONGO_URI || "mongodb://localhost:27017";
const TARGET_URI = process.env.TARGET_MONGO_URI || "mongodb://localhost:5678";
const SYSTEM_DBS = new Set(["admin", "config", "local"]);

async function connect(uri, dbName = "admin") {
    const conn = await mongoose.createConnection(`${uri}/${dbName}`).asPromise();
    return conn;
}

async function listDatabases(adminConn) {
    const result = await adminConn.db.admin().listDatabases();
    return (result.databases || []).map((db) => db.name).filter((name) => !SYSTEM_DBS.has(name));
}

async function copyCollection(sourceDbConn, targetDbConn, collectionName) {
    const sourceCollection = sourceDbConn.db.collection(collectionName);
    const targetCollection = targetDbConn.db.collection(collectionName);

    const docs = await sourceCollection.find({}).toArray();

    await targetCollection.deleteMany({});

    if (docs.length > 0) {
        await targetCollection.insertMany(docs, { ordered: false });
    }

    return docs.length;
}

async function copyDatabase(sourceUri, targetUri, dbName) {
    const sourceDbConn = await connect(sourceUri, dbName);
    const targetDbConn = await connect(targetUri, dbName);

    try {
        const collectionsInfo = await sourceDbConn.db.listCollections({}, { nameOnly: true }).toArray();
        const collections = collectionsInfo
            .map((item) => item.name)
            .filter((name) => !name.startsWith("system."));

        let dbDocCount = 0;
        for (const collection of collections) {
            const count = await copyCollection(sourceDbConn, targetDbConn, collection);
            dbDocCount += count;
            console.log(`  - ${dbName}.${collection}: ${count} docs copied`);
        }

        console.log(`Copied database '${dbName}' (${dbDocCount} docs)`);
        return { dbName, collections: collections.length, docs: dbDocCount };
    } finally {
        await sourceDbConn.close();
        await targetDbConn.close();
    }
}

async function main() {
    const adminConn = await connect(SOURCE_URI, "admin");

    try {
        const databases = await listDatabases(adminConn);

        if (databases.length === 0) {
            console.log("No non-system databases found to copy.");
            return;
        }

        console.log(`Source: ${SOURCE_URI}`);
        console.log(`Target: ${TARGET_URI}`);
        console.log(`Databases to copy: ${databases.join(", ")}`);

        const summary = [];
        for (const dbName of databases) {
            summary.push(await copyDatabase(SOURCE_URI, TARGET_URI, dbName));
        }

        const totalDocs = summary.reduce((sum, item) => sum + item.docs, 0);
        const totalCollections = summary.reduce((sum, item) => sum + item.collections, 0);

        console.log("\nCopy complete.");
        console.log(`Databases: ${summary.length}`);
        console.log(`Collections: ${totalCollections}`);
        console.log(`Documents: ${totalDocs}`);
    } finally {
        await adminConn.close();
    }
}

main().catch((error) => {
    console.error("Copy failed:", error?.message || error);
    process.exit(1);
});
