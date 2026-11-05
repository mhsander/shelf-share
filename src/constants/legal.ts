// Plain-language privacy policy and terms shown in the app at /privacy and /terms.
// TODO: have these reviewed before launch.
export const legalEffectiveDate = "November 5, 2026";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export const privacyPolicy: LegalDocument = {
  title: "Privacy policy",
  intro:
    "Shelf Share helps neighbors and friends lend books to each other. This policy explains what we collect, how it's used, and the choices you have.",
  sections: [
    {
      heading: "What we collect",
      bullets: [
        "Sign-in details: your email address and account ID from Apple or Google. Your email is never shown to other members.",
        "Profile: your display name, city, and, if you add them, your neighborhood and profile photo.",
        "Library: the books you add (title, author, ISBN, cover) and each book's status and visibility.",
        "Activity: friends and friend requests, borrow requests, messages you send about a request, blocks, and reports you file.",
        "Notifications: a device push token, if you allow notifications.",
      ],
    },
    {
      heading: "Camera",
      paragraphs: [
        "The camera is used only to read a book's barcode when you scan it. Images are not saved or uploaded.",
      ],
    },
    {
      heading: "How we use it",
      bullets: [
        "To run the app: show your library, connect you with friends, and handle borrow requests.",
        "To send notifications about requests and friend activity.",
        "To keep the community safe, including reviewing reports and enforcing blocks.",
      ],
    },
    {
      heading: "What other members see",
      paragraphs: [
        "Other members can see your display name, city, neighborhood, photo, and the books you've made visible. Friends-only books are shown only to your friends. People you block can't see your profile or books. Borrow request messages are visible only to the two people involved.",
      ],
    },
    {
      heading: "Who we share it with",
      paragraphs: [
        "We do not sell, rent, or trade your personal information, and we don't use it for advertising. We share data only with the services that run the app:",
      ],
      bullets: [
        "Supabase, which hosts our database, sign-in, and photo storage.",
        "Apple and Google, for sign-in and push notifications.",
        "Open Library and Google Books, which receive a book's ISBN to look up its details. No personal information is sent.",
      ],
    },
    {
      heading: "Deleting your data",
      paragraphs: [
        'You can edit your profile at any time, and delete your account from the Profile tab. Deleting your account removes your profile, books, and photo, and cancels active requests. Past request and message history stays visible to the other person, shown as "Deleted user".',
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Shelf Share is only for people 18 and older. We don't knowingly collect information from anyone under 18, and we'll delete any such account we learn about.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "If we change this policy, we'll update the date below and, for significant changes, let you know in the app.",
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  title: "Terms of service",
  intro:
    "By using Shelf Share you agree to these terms. Please read them; they're short.",
  sections: [
    {
      heading: "Your account",
      paragraphs: [
        "You must be at least 18 years old to use Shelf Share. You're responsible for your account and for what you post, and the information in your profile should be accurate.",
      ],
    },
    {
      heading: "Lending is between members",
      paragraphs: [
        "Shelf Share only helps members find and arrange loans. Every loan is an agreement between the lender and the borrower. We don't own, inspect, or insure any book, and we aren't responsible for books that are lost, damaged, late, or never returned. Lend only what you're comfortable lending.",
      ],
    },
    {
      heading: "Be a good neighbor",
      paragraphs: ["When using Shelf Share, don't:"],
      bullets: [
        "Harass, threaten, or impersonate anyone.",
        "Post spam, or content that is illegal, hateful, or sexually explicit.",
        "Use the app to sell items or for any commercial purpose.",
        "Try to access other members' data or interfere with the app.",
      ],
    },
    {
      heading: "Your content",
      paragraphs: [
        "You own what you add, such as your profile, photo, and messages. You give us permission to store it and show it to other members as the app is designed to, only for running Shelf Share.",
      ],
    },
    {
      heading: "Safety and enforcement",
      paragraphs: [
        "You can block or report any member. We may review reports and remove content or suspend accounts that break these terms.",
      ],
    },
    {
      heading: "Ending your use",
      paragraphs: [
        "You can stop using Shelf Share and delete your account at any time from the Profile tab.",
      ],
    },
    {
      heading: "Disclaimers",
      paragraphs: [
        'Shelf Share is provided "as is," without warranties of any kind. To the extent the law allows, we aren\'t liable for indirect or consequential damages, or for anything that happens between members, including during a loan.',
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "We may update these terms. If you keep using Shelf Share after a change, you accept the updated terms.",
      ],
    },
  ],
};
