import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { saveSettingsStep } from "./steps/save-settings"

type SavePluginSettingsInput = {
  provider_id: string
  category: string
  display_name: string
  settings: Record<string, unknown>
}

const savePluginSettingsWorkflow = createWorkflow(
  "save-plugin-settings",
  function (input: SavePluginSettingsInput) {
    const result = saveSettingsStep(input)
    return new WorkflowResponse(result)
  }
)

export default savePluginSettingsWorkflow
