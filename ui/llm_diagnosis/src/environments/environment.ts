export const environment = {
  production: true,
  aws: {
    region: 'us-east-1',
    cognito: {
      userPoolId: 'us-east-1_bzUcTSIzF',
      clientId: '5uv19f4gu7eom90pfk709r7jlh',
      domain: 'medical-diagnosis-374149329723',
      responseType: 'code',
      redirectSignIn: ['https://d1fsbknze3yrsm.cloudfront.net/'],
      redirectSignOut: ['https://d1fsbknze3yrsm.cloudfront.net/'],
      scope: ['profile', 'email', 'openid']
    },
    api: {
      endpoint: 'https://xmp63xbngk.execute-api.us-east-1.amazonaws.com/dev'
    }
  }
};
