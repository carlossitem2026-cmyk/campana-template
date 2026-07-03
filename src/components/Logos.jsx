import partyLogo from "../img/party-logo.webp";
import candidateLogo from "../img/candidate-logo.webp";
import { CAMPAIGN } from "../config/campaign";

export function PartyLogo() {
  return (
    <img
      src={partyLogo}
      alt={CAMPAIGN.partyAbbr}
      style={{
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        objectFit: "cover",
        background: "white",
        padding: "6px",
        boxShadow: "0 6px 15px rgba(0,0,0,0.15)"
      }}
    />
  );
}

export function CandidateLogo() {
  return (
    <img
      src={candidateLogo}
      alt={CAMPAIGN.candidateName}
      style={{ width: "50px", height: "50px", borderRadius: "10px" }}
    />
  );
}
