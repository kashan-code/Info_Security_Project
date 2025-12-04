#### Secure E2EE Messaging + File Sharing

## End-to-end encrypted messaging and file sharing system built with React (Web Crypto) and Node.js/Express + MongoDB. All encryption happens client-side; servers never see plaintext or private keys.

### Highlights
1- Identity keys: P-256 (ECC) identity key pair generated client-side; private key stays in IndexedDB (encrypted).
2- Session setup: Custom signed ECDH handshake + HKDF, with nonces, timestamps, sequence numbers, and key-confirmation MAC to block MITM/replay.
3- Messaging: AES-256-GCM per message with fresh IV + auth tag; metadata only on server (ciphertext, iv, tag, sender, receiver, ts, seq).
4- Files: Client-side chunked AES-256-GCM encryption; only encrypted chunks + metadata stored.
5- Logging: Auth attempts, key exchanges, replay rejections, signature failures, failed decrypts, metadata access.
6- Attacks: MITM/replay simulations + proofs that signatures/timestamps/seq-numbers prevent them.
Planned Layout
7- backend/: Express + MongoDB API for auth, metadata, logging, and relay of E2EE payloads.
8- frontend/: React app using Web Crypto for key generation/storage, handshake, encryption, replay protection, and UI.
9- docs/: Protocol flow, threat model (STRIDE), attack demos, and diagrams.
Build Stages (mapped to requirements)
10- Design docs: protocol, threat model, attack/demo plan.
11- Backend scaffold: auth + metadata API, logging, key-exchange endpoints (no plaintext).
12- Frontend crypto core: keygen/storage, signed ECDH + HKDF, message/session management, replay protection.
13- File sharing: chunked AES-GCM upload/download, metadata handling.

## Attacks/tests: MITM/replay scripts, logging verification, report polish.
###vNext Steps
Finalize protocol spec (docs/protocol.md) and STRIDE (docs/threat-model.md).
# Run dev servers:
cd backend && cp .env.example .env && npm run dev
cd frontend && npm run dev (uses Vite; API defaults to http://localhost:4000)
Client flow: register (generates/stores identity keys locally) → login → handshake (INIT/RESP/CONFIRM) → send encrypted text → upload/download encrypted file chunks.
