import cluster from 'node:cluster';
import os from 'node:os';
const NUM_WORKERS = os.cpus().length;


if (cluster.isPrimary) {
    //This block runs once - in the primary process only
    console.log(`[cluster] Primary process ${process.pid} is running`);
    console.log(`[cluster] Forking ${NUM_WORKERS} workers (one per CPU core)...`);

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
}
else {
    //This block runs once per worker 
    await import('./index.js');
    console.log(`[cluster] Worker ${process.pid} started`)

}



