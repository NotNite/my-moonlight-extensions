use serde::Serialize;
use std::{collections::HashMap, time::Duration, vec};
use zbus::{conn::Builder, interface};
use zvariant::{OwnedValue, SerializeDict, Type};

mod proto;

struct MoonlightRunner;

#[derive(Serialize, Type, Clone, Debug)]
#[zvariant(signature = "a(sss)")]
struct Action {
    id: String,
    text: String,
    icon: String,
}

#[derive(Debug, Default, SerializeDict, Type, Clone)]
#[zvariant(signature = "a{sv}")]
struct MatchProperties {
    subtext: Option<String>,
    category: Option<String>,
}

#[derive(Serialize, Type, Clone, Debug)]
struct Match {
    id: String,
    text: String,
    icon: String,
    category_relevance: i32,
    relevance: f64,
    properties: MatchProperties,
}

impl Into<Match> for &proto::MoonlightResult {
    fn into(self) -> Match {
        Match {
            id: self.id.clone(),
            text: self.title.clone(),
            relevance: self.score,
            properties: MatchProperties {
                subtext: self.subtitle.clone(),
                category: Some("Discord".to_string()),
            },

            icon: self
                .icon
                .clone()
                .unwrap_or("com.discord.Discord".to_string()),

            category_relevance: self.category_relevance,
        }
    }
}

// https://github.com/KDE/krunner/blob/19fed4f415f7eeeb75a5dd784ad4aebf88d53934/src/data/org.kde.krunner1.xml
// zbus-xmlgen file ./org.kde.krunner1.xml
#[allow(non_snake_case)]
#[allow(unused_variables)]
#[interface(name = "org.kde.krunner1")]
impl MoonlightRunner {
    async fn actions(&self) -> Vec<Action> {
        vec![Action {
            id: "open".to_string(),
            text: "Open".to_string(),
            icon: "com.discord.Discord".to_string(),
        }]
    }

    async fn _match(&self, query: &str) -> zbus::fdo::Result<Vec<Match>> {
        proto::write_request(&proto::MoonlightRequest::Search {
            query: query.to_string(),
        })
        .map_err(|e| zbus::fdo::Error::Failed(e.to_string()))?;
        let results = proto::read_results()
            .await
            .map_err(|e| zbus::fdo::Error::Failed(e.to_string()))?;
        Ok(results.iter().map(|p| p.into()).collect())
    }

    async fn run(&self, match_id: &str, _action_id: &str) -> zbus::fdo::Result<()> {
        proto::write_request(&proto::MoonlightRequest::Run {
            id: match_id.to_string(),
        })
        .map_err(|e| zbus::fdo::Error::Failed(e.to_string()))
    }

    async fn config(&self) -> HashMap<String, OwnedValue> {
        HashMap::new()
    }

    async fn set_activation_token(&self, _token: &str) {}
    async fn teardown(&self) {}
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let runner = MoonlightRunner;
    let _conn = Builder::session()?
        .name("com.notnite.moonlight-krunner")?
        .serve_at("/moonlight_krunner", runner)?
        .build()
        .await?;

    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}
