import { friendsReducer, relationshipWith, type FriendsState } from "@/lib/friends";
import type { Person } from "@/types/friends";

function person(id: string): Person {
  return { id, displayName: id, city: "Seattle", neighborhood: null, avatarUrl: null };
}

const amir = person("amir");
const ben = person("arturo");
const dev = person("dev");
const state: FriendsState = { friends: [amir], incoming: [ben], outgoing: [] };

describe("relationshipWith", () => {
  it("describes each kind of relationship", () => {
    const withOutgoing = { ...state, outgoing: [dev] };
    expect(relationshipWith(withOutgoing, "amir")).toBe("friends");
    expect(relationshipWith(withOutgoing, "arturo")).toBe("requestReceived");
    expect(relationshipWith(withOutgoing, "dev")).toBe("requestSent");
    expect(relationshipWith(withOutgoing, "nobody")).toBe("none");
  });
});

describe("friendsReducer", () => {
  it("sends a request to a stranger", () => {
    const next = friendsReducer(state, { type: "send", person: dev });
    expect(next.outgoing).toEqual([dev]);
  });

  it("becomes friends when sending to someone who already asked", () => {
    const next = friendsReducer(state, { type: "send", person: ben });
    expect(next.friends).toEqual([amir, ben]);
    expect(next.incoming).toEqual([]);
    expect(next.outgoing).toEqual([]);
  });

  it("ignores a request to an existing friend or a repeat request", () => {
    expect(friendsReducer(state, { type: "send", person: amir })).toBe(state);
    const sent = friendsReducer(state, { type: "send", person: dev });
    expect(friendsReducer(sent, { type: "send", person: dev })).toBe(sent);
  });

  it("accepts an incoming request", () => {
    const next = friendsReducer(state, { type: "accept", id: "arturo" });
    expect(next.friends).toEqual([amir, ben]);
    expect(next.incoming).toEqual([]);
  });

  it("ignores accepting a request that doesn't exist", () => {
    expect(friendsReducer(state, { type: "accept", id: "dev" })).toBe(state);
  });

  it("declines an incoming request", () => {
    const next = friendsReducer(state, { type: "decline", id: "arturo" });
    expect(next.incoming).toEqual([]);
    expect(next.friends).toEqual([amir]);
  });

  it("cancels an outgoing request", () => {
    const sent = friendsReducer(state, { type: "send", person: dev });
    expect(friendsReducer(sent, { type: "cancel", id: "dev" }).outgoing).toEqual([]);
  });

  it("removes a friend", () => {
    expect(friendsReducer(state, { type: "remove", id: "amir" }).friends).toEqual([]);
  });
});
