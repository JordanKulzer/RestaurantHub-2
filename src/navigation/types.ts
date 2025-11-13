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
};
