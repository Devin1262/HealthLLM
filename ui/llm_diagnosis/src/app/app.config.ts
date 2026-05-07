import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { Amplify } from 'aws-amplify';
import { environment } from '../environments/environment';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: environment.aws.cognito.userPoolId,
      userPoolClientId: environment.aws.cognito.clientId,
      loginWith: {
        oauth: {
          domain: `${environment.aws.cognito.domain}.auth.${environment.aws.region}.amazoncognito.com`,
          scopes: environment.aws.cognito.scope,
          redirectSignIn: environment.aws.cognito.redirectSignIn,
          redirectSignOut: environment.aws.cognito.redirectSignOut,
          responseType: 'code'
        }
      }
    }
  }
});

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
