// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

// Health Check HTTP Endpoint
// Provides a lightweight /health endpoint for monitoring infrastructure.

use std::net::SocketAddr;
use tracing::{error, info};

/// Starts a minimalist HTTP health check server on the specified address.
/// Runs concurrently alongside the gRPC server and P2P Mesh.
pub async fn start_health_server(addr: SocketAddr) {
    use tokio::io::AsyncWriteExt;
    use tokio::net::TcpListener;

    let listener = match TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            error!(error = %e, addr = %addr, "Failed to bind health check server");
            return;
        }
    };

    info!(addr = %addr, "Health check endpoint active on /health");

    loop {
        let (mut stream, _) = match listener.accept().await {
            Ok(conn) => conn,
            Err(_) => continue,
        };

        tokio::spawn(async move {
            let mut buf = [0u8; 1024];
            let _ = tokio::io::AsyncReadExt::read(&mut stream, &mut buf).await;

            let request_line = String::from_utf8_lossy(&buf);

            let (status, content_type, body) = if request_line.starts_with("GET /health") {
                (
                    "200 OK",
                    "application/json",
                    r#"{"status":"healthy","service":"liop-node","version":"1.0.0-alpha"}"#.to_string(),
                )
            } else if request_line.starts_with("GET /metrics") {
                let metrics_payload = concat!(
                    "# HELP liop_node_up LIOP Rust node health indicator\n",
                    "# TYPE liop_node_up gauge\n",
                    "liop_node_up{version=\"1.0.0-alpha\"} 1\n"
                )
                .to_string();
                (
                    "200 OK",
                    "text/plain; version=0.0.4; charset=utf-8",
                    metrics_payload,
                )
            } else {
                (
                    "404 Not Found",
                    "application/json",
                    r#"{"error":"not found"}"#.to_string(),
                )
            };

            let response = format!(
                "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                status,
                content_type,
                body.len(),
                body
            );

            let _ = stream.write_all(response.as_bytes()).await;
        });
    }
}
