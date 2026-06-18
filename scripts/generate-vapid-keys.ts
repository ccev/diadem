import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Add these to config.toml under [server.push]:\n");
console.log(`vapidPublicKey = "${keys.publicKey}"`);
console.log(`vapidPrivateKey = "${keys.privateKey}"`);
console.log(`\nAlso set vapidSubject = "mailto:you@example.com"`);
