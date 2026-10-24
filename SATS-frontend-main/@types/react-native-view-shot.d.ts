// Minimal type declarations for react-native-view-shot

declare module 'react-native-view-shot' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface ViewShotProps extends ViewProps {
    options?: {
      format?: 'png' | 'jpg' | 'webm';
      quality?: number;
      result?: 'tmpfile' | 'base64' | 'data-uri';
      width?: number;
      height?: number;
    };
    onCapture?: (uri: string) => void;
    captureMode?: 'mount' | 'continuous' | 'update';
  }

  export default class ViewShot extends React.Component<ViewShotProps, any> {
    constructor(props: ViewShotProps);
    context: any;
    setState: any;
    forceUpdate: any;
    render(): React.ReactNode;
  }

  export function captureRef(
    viewRef: React.RefObject<any> | number,
    options?: {
      format?: 'png' | 'jpg' | 'webm';
      quality?: number;
      result?: 'tmpfile' | 'base64' | 'data-uri';
      width?: number;
      height?: number;
    }
  ): Promise<string>;
}
