import cluster from 'node:cluster';
import os from 'node:os';
const NUM_WORKERS = os.cpus().length;

//if the code is run as a primary process
if (cluster.isPrimary) {
    console.clear();
    console.log('---------------------------------------------------------');
    console.log(' Weather API Cluster System');
    console.log(` Status: Running on http://localhost:8080`);
    console.log(` Workers: ${NUM_WORKERS} (Active)`);
    console.log('---------------------------------------------------------');

    // Fork a worker for each CPU core
    for (let i = 0; i < NUM_WORKERS; i++) {
        cluster.fork();
    }

    //If a worker unexpectedly , spawn a replacement automatically 
    cluster.on('exit', (worker, code, signal) => {
        console.warn(
            `[cluster] Worker ${worker.process.pid} exited` +
            `(code=${code}, signal=${signal}). Spawning replacement...`
        );
        cluster.fork();
    });

    // Shutdown Logic
    const shutdown = () => {
        console.log('\n[cluster] Received kill signal. Shutting down workers gracefully...');
        for (const id in cluster.workers) {
            cluster.workers[id]?.send('shutdown');
            cluster.workers[id]?.disconnect();
        }

        // Forced exit after 5s if workers hang
        setTimeout(() => {
            console.error('[cluster] Forcefully shutting down.');
            process.exit(1);
        }, 5000);
    };
    // Graceful shutdown on SIGTERM and SIGINT
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
else {
    //This block runs once per worker 
    await import('./index.js');
}



