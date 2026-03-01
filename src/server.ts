// This file handles running the app on multiple CPU cores (Clustering)
import cluster from 'node:cluster'; // Native tool for clustering
import os from 'node:os'; // Used to count how many CPU cores we have

const NUM_WORKERS = os.cpus().length; // Use as many workers as possible

// Stage 1: The "Primary" process (The Boss)
if (cluster.isPrimary) {
    console.clear();
    console.log('---------------------------------------------------------');
    console.log(' Weather API Cluster System');
    console.log(` Status: Running on http://localhost:8080`);
    console.log(` Workers: ${NUM_WORKERS} (Active)`);
    console.log('---------------------------------------------------------');

    // Create a new "Worker" for every CPU core
    for (let i = 0; i < NUM_WORKERS; i++) {
        cluster.fork();
    }

    // If a worker crashes, spawn a replacement immediately (Self-Healing)
    cluster.on('exit', (worker, code, signal) => {
        console.warn(
            `[cluster] Worker ${worker.process.pid} died. Spawning a new one...`
        );
        cluster.fork();
    });

    // Clean shutdown logic (Graceful Exit)
    const shutdown = () => {
        console.log('\n[cluster] Received stop signal. Cleaning up workers...');
        for (const id in cluster.workers) {
            cluster.workers[id]?.send('shutdown');
            cluster.workers[id]?.disconnect();
        }

        // If it takes too long (> 5s), just force it to close
        setTimeout(() => {
            console.error('[cluster] Shutdown timed out. Forcing exit.');
            process.exit(1);
        }, 5000);
    };

    // Listen for "Stop" signals (like Ctrl+C)
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
else {
    // Stage 2: The "Worker" process (The actual workers doing the work)
    await import('./index.js');
}



