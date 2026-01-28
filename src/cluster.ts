import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  for (let i = 0; i < os.availableParallelism(); i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, _code, _signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  await import("./index");
  console.log(`Worker ${process.pid} started`);
}
