import Link from "next/link";
export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        <span>Х</span>ҮРЭЭ
      </Link>
      <div className="auth-cinematic" />
      <div className="auth-success standalone">
        <i>{error ? "!" : "✉"}</i>
        <h2>
          {error ? "Холбоос хүчингүй байна" : "Имэйлээ баталгаажуулна уу"}
        </h2>
        <p>
          {error
            ? "Баталгаажуулах холбоосын хугацаа дууссан эсвэл ашиглагдсан байна."
            : "Таны inbox руу илгээсэн холбоос дээр дарсны дараа нэвтрэх боломжтой."}
        </p>
        <Link href="/login">Нэвтрэх хуудас руу очих</Link>
      </div>
    </main>
  );
}
