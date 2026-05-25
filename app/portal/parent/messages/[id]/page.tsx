import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { ThreadView } from "@/components/ThreadView";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { markThreadRead } from "../../../messages/actions";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function ParentThreadPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user || user.role !== "PARENT") redirect("/portal/login");

  const thread = await prisma.messageThread.findUnique({
    where: { id: params.id },
    include: {
      parent: { select: { userId: true } },
      teacher: { include: { user: { select: { name: true, image: true } } } },
      student: { include: { user: { select: { name: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!thread) notFound();
  if (thread.parent.userId !== user.id) redirect("/portal/parent/messages");

  // Best-effort: clear unread counter when the parent opens the thread.
  await markThreadRead(thread.id);

  return (
    <PortalShell role="parent">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/portal/parent/messages" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-brand-900">Conversation</h1>
      </div>

      <ThreadView
        threadId={thread.id}
        subject={thread.subject}
        counterpartName={thread.teacher.user.name}
        studentLabel={thread.student?.user.name ?? null}
        currentUserId={user.id}
        peerLastReadAt={thread.teacherLastReadAt}
        messages={thread.messages.map(m => ({
          id: m.id,
          authorId: m.authorId,
          authorName: m.author.name,
          body: m.body,
          createdAt: m.createdAt,
          attachmentUrl: m.attachmentUrl,
          attachmentName: m.attachmentName,
          attachmentMime: m.attachmentMime,
          attachmentSize: m.attachmentSize,
        }))}
      />
    </PortalShell>
  );
}
