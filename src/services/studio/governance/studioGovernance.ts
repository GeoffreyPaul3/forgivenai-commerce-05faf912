import { SceneBlueprint } from "../types/types";

export interface GovernanceUser {
  id: string;
  role: "ADMINISTRATOR" | "CREATIVE_DIRECTOR" | "EDITOR" | "VIEWER";
}

export class StudioGovernance {
  public static canModifyBlueprints(user: GovernanceUser): boolean {
    return user.role === "ADMINISTRATOR" || user.role === "CREATIVE_DIRECTOR";
  }

  public static publishBlueprint(blueprint: SceneBlueprint, user: GovernanceUser): SceneBlueprint {
    if (!this.canModifyBlueprints(user)) {
      throw new Error(`Governance Violation: User with role '${user.role}' is prohibited from publishing Scene Blueprints.`);
    }

    return {
      ...blueprint,
      approvedBy: user.id,
      approvalDate: new Date().toISOString().split("T")[0]
    };
  }
}
