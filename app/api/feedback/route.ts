import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { message, email } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 },
      );
    }

    const recipientEmail = process.env.FEEDBACK_EMAIL;
    if (!recipientEmail) {
      console.error("FEEDBACK_EMAIL environment variable is not set");
      return NextResponse.json(
        { error: "Feedback email recipient is not configured" },
        { status: 500 },
      );
    }

    const { data, error } = await resend.emails.send({
      from: "Feed the Kraken Feedback <feed-the-kraken-feedback@feed-the-kraken-feedback.ukko.la>",
      to: [recipientEmail],
      subject: "New Feedback Received - Feed the Kraken Companion",
      html: `
        <h2>New Feedback Received</h2>
        <p><strong>Message:</strong></p>
        <div style="padding: 15px; background-color: #f4f4f4; border-radius: 5px; color: #333;">
          ${message.replace(/\n/g, "<br>")}
        </div>
        <p><strong>User Email:</strong> ${email || "Anonymous"}</p>
        <hr>
        <p><small>Sent via Feed the Kraken Companion Feedback Feature</small></p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Feedback API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
