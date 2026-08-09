import type { ChatPollPayload } from "@activity-match/shared";

export function applyPollVote(
  payload: ChatPollPayload,
  optionId: string,
  userId: string,
): ChatPollPayload {
  const allowMultiple = Boolean(payload.allow_multiple);

  const options = (payload.options ?? []).map((option) => {
    const existingVotes = option.votes ?? [];
    const withoutUser = existingVotes.filter((id) => id !== userId);

    if (option.id !== optionId) {
      return allowMultiple ? option : { ...option, votes: withoutUser };
    }

    if (allowMultiple) {
      const alreadyVoted = existingVotes.includes(userId);
      return {
        ...option,
        votes: alreadyVoted ? withoutUser : [...withoutUser, userId],
      };
    }

    return { ...option, votes: [...withoutUser, userId] };
  });

  return { ...payload, options };
}
