import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { fetchAuthSession } from 'aws-amplify/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return from(fetchAuthSession()).pipe(
    switchMap((session: any) => {
      console.log('Auth session:', session);
      
      // API Gateway Cognito authorizer requires the ID token, not the access token
      if (session?.tokens?.idToken) {
        // The idToken might be a JWT object or a string
        let token: string;
        if (typeof session.tokens.idToken === 'string') {
          token = session.tokens.idToken;
        } else if (session.tokens.idToken.toString) {
          token = session.tokens.idToken.toString();
        } else {
          console.error('Unable to convert idToken to string:', session.tokens.idToken);
          return next(req);
        }
        
        console.log('Adding ID token to request:', req.url);
        console.log('Token preview:', token.substring(0, 50) + '...');
        
        const clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        
        return next(clonedReq);
      } else {
        console.warn('No ID token found in session for request:', req.url);
        console.log('Available tokens:', Object.keys(session?.tokens || {}));
        return next(req);
      }
    })
  );
};
