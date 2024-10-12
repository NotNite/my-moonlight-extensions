mod base;
mod proto;

#[cfg(windows)]
mod windows;

async fn input_handler(fetcher: &Box<dyn base::MediaFetcher>) -> anyhow::Result<()> {
    loop {
        if let Ok(command) = base::receive_command().await {
            if let Err(e) = fetcher.handle_command(command).await {
                eprintln!("Error in command handler: {:?}", e);
            }
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    #![allow(unused_assignments)]
    let mut fetcher: Option<Box<dyn base::MediaFetcher>> = None;

    #[cfg(windows)]
    {
        fetcher = Some(Box::new(windows::WindowsMediaFetcher::default()));
    }

    if let Some(mut fetcher) = fetcher {
        fetcher.init().await?;

        tokio::select! {
            input_result = input_handler(&fetcher) => {
                if let Err(e) = input_result {
                    eprintln!("Error in input handler: {:?}", e);
                }
            },
            fetcher_result = fetcher.run() => {
                if let Err(e) = fetcher_result {
                    eprintln!("Error in fetcher: {:?}", e);
                }
            },
            _ = tokio::signal::ctrl_c() => {},
        }

        Ok(())
    } else {
        anyhow::bail!("Unsupported platform");
    }
}
