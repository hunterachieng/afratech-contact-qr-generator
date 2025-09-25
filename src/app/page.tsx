"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import QRCode from "qrcode";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Format = "vcard" | "text";

const FormSchema = z.object({
  name: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(5, { message: "Phone number is required" }).max(13),
  office: z.string(),
  format: z.enum(["vcard", "text"]),
});

type FormValues = z.infer<typeof FormSchema>;

function buildVCard({ name, email, phone, office }: FormValues) {
  const n = name.trim();
  const parts = n.split(" ");
  const family = parts.slice(-1)[0] || "";
  const given = parts.slice(0, -1).join(" ") || n;
  const adr = (office || "").trim();

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${family};${given};;;`,
    `FN:${n}`,
    `TEL;TYPE=CELL:${phone.trim()}`,
    `EMAIL;TYPE=INTERNET:${email.trim()}`,
    `ADR;TYPE=WORK:;;${adr};;;;`,
    "END:VCARD",
  ].join("\n");
}

function buildPlain({ name, email, phone, office, format }: FormValues) {
  return [
    `Name: ${name.trim()}`,
    `Email: ${email.trim()}`,
    `Phone: ${phone.trim()}`,
    `Office: ${(office || "").trim()}`,
    `Format: ${format}`,
  ].join("\n");
}

export default function Page() {
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      office: "",
      format: "vcard",
    },
    mode: "onChange",
  });

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);

  const values = form.watch();
  const payload = useMemo(() => {
    if (!values.name || !values.email || !values.phone) return "";
    return values.format === "vcard" ? buildVCard(values) : buildPlain(values);
  }, [values]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = {
      name: params.get("name") ?? "",
      email: params.get("email") ?? "",
      phone: params.get("phone") ?? "",
      office: params.get("office") ?? "",
      format: (params.get("format") as Format) ?? "vcard",
    };
    const anyPresent = Object.values(data).some(Boolean);
    if (anyPresent) {
      form.reset({
        name: data.name,
        email: data.email,
        phone: data.phone,
        office: data.office,
        format: (["vcard", "text"] as const).includes(data.format)
          ? data.format
          : "vcard",
      });
      if (data.name && data.email && data.phone) {
        void generateQR();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function encodeBase64(str: string) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }

  function buildShareUrlLocalFromPayload(payload: string) {
    const u = new URL(window.location.origin);
    u.pathname = "/qr";
    u.searchParams.set("p", encodeBase64(payload)); // encoded payload
    return u.toString();
  }

  async function generateQR() {
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Please fix the form errors.");
      return;
    }
    try {
      setHasGenerated(false);
      setQrDataUrl("");
      const data = payload; 
      const url = await QRCode.toDataURL(data, {
        width: 512,
        margin: 2,
        color: { dark: "#000", light: "#fff" },
      });
      setQrDataUrl(url);
      setShareUrl(buildShareUrlLocalFromPayload(data)); // <-- QR-only link
      setHasGenerated(true);
      toast.success("QR generated.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to generate QR");
    }
  }

  async function onDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "contact-qr.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function onShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      try {
        const el = document.createElement("input");
        el.value = shareUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        toast.success("Link copied to clipboard!");
      } catch {
        prompt("Copy this link:", shareUrl);
      }
    }
  }

  return (
    <div className="container mx-auto max-w-3xl p-6 text-center">
      <h1 className="text-2xl font-semibold mb-4 text-center">
        Afratech Africa Contact QR Generator
      </h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void generateQR();
              }}
              className="grid gap-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Amina Okoro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="amina@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact (Phone)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+254712345678"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="office"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Nairobi HQ, 3rd Floor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QR Format</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vcard">
                          vCard (recommended)
                        </SelectItem>
                        <SelectItem value="text">Plain text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="submit"
                  className="bg-[#2564a6] hover:bg-[#7ab8dc]"
                >
                  Generate QR
                </Button>
                <span className={!hasGenerated ? "cursor-not-allowed" : ""}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!hasGenerated}
                    onClick={onDownload}
                  >
                    Download PNG
                  </Button>
                </span>
                <span className={!hasGenerated ? "cursor-not-allowed" : ""}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!hasGenerated}
                    onClick={onShareLink}
                  >
                    Share Link
                  </Button>
                </span>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {hasGenerated && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[264px] grid place-items-center border border-dashed rounded-md p-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" width={256} height={256} />
              ) : (
                <p className="text-muted-foreground">
                  Fill the required fields, then click{" "}
                  <span className="font-medium">Generate QR</span>.
                </p>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-3 break-all">
              Shareable link:{" "}
              <a
                className="underline"
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
              >
                {shareUrl}
              </a>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
