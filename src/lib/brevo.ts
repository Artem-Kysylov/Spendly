interface BrevoEmailParams {
  to: string;
  templateId: number;
  params: {
    FIRSTNAME: string;
    [key: string]: string;
  };
}

export async function sendBrevoEmail({
  to,
  templateId,
  params,
}: BrevoEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("[Brevo] API key is missing");
    return { success: false, error: "Brevo API key not configured" };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        to: [{ email: to }],
        templateId,
        params,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Brevo] Email send failed:", errorData);
      return {
        success: false,
        error: `Brevo API error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log("[Brevo] Email sent successfully:", data);
    return { success: true };
  } catch (error) {
    console.error("[Brevo] Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  const templateId = parseInt(
    process.env.BREVO_WELCOME_TEMPLATE_ID || "1",
    10
  );

  return sendBrevoEmail({
    to: email,
    templateId,
    params: {
      FIRSTNAME: firstName,
    },
  });
}

export async function sendProSuccessEmail(
  email: string,
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  const templateId = parseInt(process.env.BREVO_PRO_TEMPLATE_ID || "2", 10);

  return sendBrevoEmail({
    to: email,
    templateId,
    params: {
      FIRSTNAME: firstName,
    },
  });
}
