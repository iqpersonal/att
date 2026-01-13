"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLeadWelcomeMessage = exports.whatsappWebhook = exports.refreshMetaTokensDaily = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
function shouldRefreshToken(expiresAt) { return expiresAt - Math.floor(Date.now() / 1000) <= 604800; }
exports.refreshMetaTokensDaily = functions.pubsub.schedule("every day 02:00").timeZone("UTC").onRun(async () => { const appId = process.env.META_APP_ID; const appSecret = process.env.META_APP_SECRET; if (!appId || !appSecret)
    return; const snaps = await db.collection("tenants").get(); for (const snap of snaps.docs) {
    try {
        const meta = await snap.ref.collection("integrations").doc("meta").get();
        if (!meta.exists)
            continue;
        const data = meta.data();
        if (!shouldRefreshToken(data.expiresAt || 0))
            continue;
        const now = Math.floor(Date.now() / 1000);
        const url = "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=" + appId + "&client_secret=" + appSecret + "&fb_exchange_token=" + data.accessToken;
        const res = await fetch(url, { method: "GET" });
        const json = await res.json();
        if (json.error)
            continue;
        await snap.ref.collection("integrations").doc("meta").update({ accessToken: json.access_token, expiresAt: now + (json.expires_in || 5184000), refreshedAt: now, tokenVersion: (data.tokenVersion || 0) + 1 });
    }
    catch (e) { }
} });
exports.whatsappWebhook = functions.https.onRequest(async (r, s) => { s.json({ ok: true }); });
exports.sendLeadWelcomeMessage = functions.firestore.document("tenants/{tenantId}/leads/{leadId}").onCreate(async () => { });
//# sourceMappingURL=index.js.map