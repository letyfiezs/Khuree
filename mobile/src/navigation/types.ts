export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Movies: undefined;
  Series: undefined;
  Live: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Search: undefined;
  MovieDetail: { slug: string };
  SeriesDetail: { id: string };
  Watch: { slug: string };
  Subscription: undefined;
};
