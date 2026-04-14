export type UserRole = 'customer' | 'restaurant_staff' | 'restaurant_admin';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: any;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Breakfast' | 'Lunch' | 'Snacks' | 'Beverages' | 'Specials';
  photoUrl: string;
  price: number;
  available: boolean;
  description?: string;
  createdAt: any;
}

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  photoUrl?: string;
}

export interface Order {
  id: string;
  orderId?: string;
  userId?: string;
  studentId?: string;
  studentName?: string;
  restaurantName?: string;
  restaurantArea?: string;
  deliveryAddress?: string;
  riderName?: string;
  riderPhone?: string;
  estimatedDeliveryTime?: number;
  items: CartItem[];
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Feedback {
  id: string;
  orderId: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface PredictionItem {
  itemName: string;
  predictedQty: number;
  reasoning: string;
}
