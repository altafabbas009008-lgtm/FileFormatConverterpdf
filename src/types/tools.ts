export type ToolId = 
  | 'merge' 
  | 'split' 
  | 'compress' 
  | 'organize' 
  | 'rotate' 
  | 'pdf-to-img' 
  | 'img-to-pdf';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  p0FeatureRef: string;
  acceptTypes: string[];
}
