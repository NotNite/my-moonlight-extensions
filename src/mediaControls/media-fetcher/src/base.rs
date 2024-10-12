use crate::proto;
use async_trait::async_trait;
use tokio::io::AsyncBufReadExt;

#[async_trait]
pub trait MediaFetcher {
    async fn init(&mut self) -> anyhow::Result<()>;
    async fn run(&self) -> anyhow::Result<()>;
    async fn handle_command(&self, request: proto::Request) -> anyhow::Result<()>;
}

pub fn send_response(response: proto::Response) -> anyhow::Result<()> {
    let str = serde_json::to_string(&response)?;
    println!("{}", str);
    Ok(())
}

pub async fn receive_command() -> anyhow::Result<proto::Request> {
    let stdin = tokio::io::stdin();
    let mut buf = tokio::io::BufReader::new(stdin);

    let mut str = String::new();
    buf.read_line(&mut str).await?;

    let command = serde_json::from_str(&str)?;
    Ok(command)
}

pub fn compare_floats(a: f64, b: f64) -> bool {
    const VARIANCE: f64 = 0.1;
    (a - b).abs() < VARIANCE
}
