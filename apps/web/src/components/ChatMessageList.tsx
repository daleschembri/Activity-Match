import { motion } from "framer-motion";
import { SystemMessage } from "@activity-match/ui";
import type { ChatDisplayItem, ChatMessage } from "@/lib/chatMessages";
import {
  formatMessageTime,
  senderDisplayName,
  senderInitials,
} from "@/lib/chatMessages";
import { messageIn } from "@/lib/motion";

interface ChatMessageListProps {
  items: ChatDisplayItem[];
}

function ChatAvatar({ message }: { message: ChatMessage }) {
  const name = senderDisplayName(message);
  const avatarRef = message.sender?.avatar_ref;

  if (avatarRef) {
    return (
      <img
        src={avatarRef}
        alt=""
        className="w-9 h-9 rounded-full object-cover shrink-0 bg-surface-container"
      />
    );
  }

  return (
    <div
      className="w-9 h-9 rounded-full shrink-0 bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-bold"
      aria-hidden
    >
      {senderInitials(name)}
    </div>
  );
}

function IncomingMessageGroup({ messages }: { messages: ChatMessage[] }) {
  const lastMessage = messages[messages.length - 1];
  const name = senderDisplayName(messages[0]);

  return (
    <motion.div
      className="flex gap-2 items-end mb-4"
      variants={messageIn}
      initial="hidden"
      animate="show"
      layout
    >
      <ChatAvatar message={messages[0]} />
      <div className="flex flex-col items-start max-w-[78%] min-w-0">
        <p className="text-label-sm font-semibold text-on-surface-variant mb-1 px-1">{name}</p>
        <div className="flex flex-col items-start gap-1 w-full">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              layout
              className={`bg-surface-container-low border border-outline-variant/15 text-on-surface px-4 py-2.5 text-body-md ${
                messages.length === 1
                  ? "rounded-2xl rounded-bl-md"
                  : index === 0
                    ? "rounded-2xl rounded-bl-md"
                    : index === messages.length - 1
                      ? "rounded-2xl rounded-tl-md"
                      : "rounded-2xl rounded-l-md"
              }`}
            >
              {message.body}
            </motion.div>
          ))}
        </div>
        <time
          className="text-label-sm text-on-surface-variant mt-1.5 px-1"
          dateTime={lastMessage.created_at}
        >
          {formatMessageTime(lastMessage.created_at)}
        </time>
      </div>
    </motion.div>
  );
}

function OutgoingMessageGroup({ messages }: { messages: ChatMessage[] }) {
  const lastMessage = messages[messages.length - 1];

  return (
    <motion.div
      className="flex justify-end mb-4"
      variants={messageIn}
      initial="hidden"
      animate="show"
      layout
    >
      <div className="flex flex-col items-end max-w-[78%] min-w-0">
        <div className="flex flex-col items-end gap-1 w-full">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              layout
              className={`bg-primary text-on-primary px-4 py-2.5 text-body-md ${
                messages.length === 1
                  ? "rounded-2xl rounded-br-md"
                  : index === 0
                    ? "rounded-2xl rounded-br-md"
                    : index === messages.length - 1
                      ? "rounded-2xl rounded-tr-md"
                      : "rounded-2xl rounded-r-md"
              }`}
            >
              {message.body}
            </motion.div>
          ))}
        </div>
        <time
          className="text-label-sm text-on-surface-variant mt-1.5 px-1"
          dateTime={lastMessage.created_at}
        >
          {formatMessageTime(lastMessage.created_at)}
        </time>
      </div>
    </motion.div>
  );
}

export function ChatMessageList({ items }: ChatMessageListProps) {
  return (
    <div className="flex flex-col">
      {items.map((item) => {
        if (item.kind === "system") {
          return (
            <motion.div
              key={item.message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <SystemMessage
                type={(item.message.payload.system_type as string) ?? "info"}
                body={item.message.body}
              />
            </motion.div>
          );
        }

        if (item.isMine) {
          return <OutgoingMessageGroup key={item.messages[0].id} messages={item.messages} />;
        }

        return <IncomingMessageGroup key={item.messages[0].id} messages={item.messages} />;
      })}
    </div>
  );
}
