/**
 * Entry Point - Cluster & Process Manager
 * This file starts the app on multiple CPU cores to make it fast and handles shutdowns.
 */
import cluster from 'node:cluster';
import os from 'node:os';
const NUM_WORKERS = os.cpus().length;

//If the code is run as a primary process
if (cluster.isPrimary) {
    console.clear();
    console.log('---------------------------------------------------------');
    console.log(' Weather API Cluster System');
    console.log(` Status: Running on http://localhost:8080`);
    console.log(` Workers: ${NUM_WORKERS} (Active)`);
    console.log('---------------------------------------------------------');

    // Create a new worker for every CPU core
    for (let i = 0; i < NUM_WORKERS; i++) {
        cluster.fork();
    }

    // If a worker crashes, spawn a replacement immediately
    cluster.on('exit', (worker, code, signal) => {
        console.warn(
            `[cluster] Worker ${worker.process.pid} exited` +
            `(code=${code}, signal=${signal}). Spawning replacement...`
        );
        cluster.fork();
    });


    /*
    Make sure that when we stop the server, it closes completely
     instead of  crashing
     */
    const shutdown = () => {
        console.log('\n[cluster] Received stop signal. Cleaning up workers...');
        for (const id in cluster.workers) {
            cluster.workers[id]?.send('shutdown');
            cluster.workers[id]?.disconnect();
        }

        // Forced exit after 5s if workers hang
        setTimeout(() => {
            console.error('[cluster] Shutdown timed out. Forcing exit.');
            process.exit(1);
        }, 5000);
    };

    // Listen for Stop signals 
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
else {
    //This block runs once per worker 
    await import('./index.js');
}



