export type CampaignField =
  | 'business_name'
  | 'business_email'
  | 'campaign_name'
  | 'start_date'
  | 'end_date'
  | 'budget'
  | 'geography'
  | 'iab_category'

export interface CampaignState {
  business_name?: string
  business_email?: string
  campaign_name?: string
  start_date?: string
  end_date?: string
  budget?: string
  geography?: string
  iab_category?: string
  creative_file_name?: string
  creative_file_size?: number
  creative_file_type?: string
  creative_uploaded?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type UIPhase =
  | 'chatting'
  | 'uploading'
  | 'reviewing'
  | 'submitted'

export interface StreamEvent {
  type:
    | 'text'
    | 'field_saved'
    | 'request_upload'
    | 'campaign_ready'
    | 'state_update'
    | 'error'
    | 'done'
  delta?: string
  field?: string
  value?: string
  campaignData?: CampaignState
  state?: CampaignState
  message?: string
}

export interface BeeswaxDraftResult {
  success: boolean
  advertiserId?: string
  campaignId?: string
  lineItemId?: string
  error?: string
  mock?: boolean
}

export const FIELD_LABELS: Record<CampaignField, string> = {
  business_name: 'Business Name',
  business_email: 'Email',
  campaign_name: 'Campaign Name',
  start_date: 'Start Date',
  end_date: 'End Date',
  budget: 'Budget',
  geography: 'Geography',
  iab_category: 'Business Sector',
}

export const ALL_FIELDS: CampaignField[] = [
  'business_name',
  'business_email',
  'campaign_name',
  'start_date',
  'end_date',
  'budget',
  'geography',
  'iab_category',
]
