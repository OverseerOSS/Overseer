export async function sendDiscordNotification(webhookUrl: string, monitorName: string, status: string, details?: string) {
  const isUp = status === 'operational';
  const color = isUp ? 0x2ecc71 : 0xe74c3c;
  const emoji = isUp ? '✅' : '❌';

  const embed = {
    title: `${emoji} Monitor ${isUp ? 'Operational' : 'Down'}: ${monitorName}`,
    description: details || `Monitor ${monitorName} is now ${status}.`,
    color: color,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Overseer Monitoring",
    },
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord webhook failed: ${response.status} ${errorText}`);
      return { success: false, error: `Discord error: ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send Discord notification:", error);
    return { success: false, error: error.message };
  }
}
