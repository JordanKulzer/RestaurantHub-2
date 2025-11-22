// types.ts

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Auth: undefined;
  ListDetail: {
    listId: string;
    title: string;
  };
  RestaurantDetail: {
    restaurantId: string;
  };
  JoinList: {
    shareLinkId: string;
  };
};

export type TabParamList = {
  Home: undefined;
  Shuffle: undefined;
  Search: undefined;
  Account: undefined;
};
