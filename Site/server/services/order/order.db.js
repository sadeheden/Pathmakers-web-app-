import { MongoClient } from "mongodb";
const uri = "mongodb+srv://<username>:<password>@<cluster-url>/travel?retryWrites=true&w=majority";
const client = new MongoClient(uri);

export async function getDb() {
    if (!client.topology || !client.topology.isConnected()) {
        await client.connect();
    }
    return client.db("travel");
}
