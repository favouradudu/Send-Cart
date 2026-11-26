import { useState } from "react";
import { MessageSquareText, X, Send, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SUPPORT_WHATSAPP = "2347014020231";
const SUPPORT_EMAIL = "favouradudu33@gmail.com";

type FeedbackCategory = "idea" | "issue" | "praise" | "other";

export function FloatingFeedback() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [message, setMessage] = useState("");

  const formatMessage = () => {
    const page = typeof window !== "undefined" ? window.location.pathname : "";
    return `*SendCart Feedback* (${category.toUpperCase()})\n\n${message.trim()}\n\n_Page: ${page}_`;
  };

  const handleSendWhatsApp = () => {
    if (!message.trim()) return;
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(formatMessage())}`;
    window.open(url, "_blank");
    setMessage("");
    setOpen(false);
  };

  const handleSendEmail = () => {
    if (!message.trim()) return;
    const subject = encodeURIComponent(`SendCart Feedback: ${category}`);
    const body = encodeURIComponent(formatMessage());
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setMessage("");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="floating-feedback-trigger"
        aria-label="Send Feedback"
      >
        <MessageSquareText className="h-4 w-4" />
        <span>Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px] p-6 bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">
              Share your thoughts
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Have an idea, spotted a bug, or need help? We read every note.
            </p>
          </DialogHeader>

          <div className="flex gap-2 my-3">
            {(["idea", "issue", "praise", "other"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded border transition-colors ${
                  category === cat
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "bg-muted/40 text-muted-foreground border-border hover:border-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you think or what we can improve..."
            rows={4}
            className="w-full text-sm p-3 rounded border border-border bg-background focus:outline-none focus:border-foreground resize-none"
          />

          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!message.trim()}
              className="flex-1 gap-2 text-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Send on WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSendEmail}
              disabled={!message.trim()}
              className="gap-2 text-xs"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
            }
