use serde::{Deserialize, Serialize};
use tokio::io::AsyncBufReadExt;

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum MoonlightRequest {
    Search { query: String },
    Run { id: String },
}

#[derive(Deserialize, Clone, Debug)]
pub enum MoonlightResultType {
    User,
    Guild,
    GroupDM,
    TextChannel,
    VoiceChannel,
}

#[derive(Deserialize, Clone, Debug)]
pub struct MoonlightResult {
    pub r#type: MoonlightResultType,
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub icon: Option<String>,
    pub score: f64,
    pub category_relevance: i32,
}

pub fn write_request(request: &MoonlightRequest) -> eyre::Result<()> {
    println!("{}", serde_json::to_string(request)?);
    Ok(())
}

pub async fn read_results() -> eyre::Result<Vec<MoonlightResult>> {
    let stdin = tokio::io::stdin();
    let mut buf = tokio::io::BufReader::new(stdin);

    let mut str = String::new();
    buf.read_line(&mut str).await?;

    Ok(serde_json::from_str(&str)?)
}
