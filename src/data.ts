export type Experience = {
  id: number
  title: string
  city: string
  category: string
  price: number
  rating: number
  image: string
  date: string
  description: string
}

export const experiences: Experience[] = [
  { id: 1, title: 'Bengaluru Museum of Art', city: 'Bengaluru', category: 'Museum', price: 149, rating: 4.9, date: 'Open daily', image: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=85', description: 'Explore contemporary Indian art, historic galleries and immersive installations in the heart of Bengaluru.' },
  { id: 2, title: 'Echoes of India Live', city: 'Bengaluru', category: 'Concert', price: 499, rating: 4.8, date: '12 Nov, 7 PM', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85', description: 'An electrifying evening celebrating classical roots and modern Indian sound.' },
  { id: 3, title: 'Nandi Hills Sunrise Trek', city: 'Bengaluru', category: 'Adventure', price: 799, rating: 4.9, date: 'Every weekend', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85', description: 'Begin before dawn and watch the hills wake up from one of Karnataka’s most loved viewpoints.' },
  { id: 4, title: 'Modern India Exhibition', city: 'Mumbai', category: 'Exhibition', price: 299, rating: 4.7, date: '18–24 Nov', image: 'https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&w=1200&q=85', description: 'A curated showcase of architecture, design and ideas shaping modern India.' },
  { id: 5, title: 'Comedy Under the Stars', city: 'Pune', category: 'Culture', price: 399, rating: 4.8, date: '15 Nov, 8 PM', image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=85', description: 'A relaxed open-air comedy night featuring some of the country’s freshest voices.' },
  { id: 6, title: 'Mythic Kingdoms Quest', city: 'Bengaluru', category: 'Experience', price: 649, rating: 4.6, date: 'Weekends', image: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?auto=format&fit=crop&w=1200&q=85', description: 'Solve puzzles, uncover stories and journey through a richly themed adventure quest.' },
  { id: 7, title: 'Hampi Heritage Walk', city: 'Hampi', category: 'Attraction', price: 349, rating: 4.9, date: 'Tue–Sun, 6 AM', image: 'https://images.unsplash.com/photo-1590059390041-2f6b1f1c95a2?auto=format&fit=crop&w=1200&q=85', description: 'Discover temple lanes, royal ruins and living traditions with a local storyteller.' },
  { id: 8, title: 'Indie Pop Festival', city: 'Hyderabad', category: 'Concert', price: 899, rating: 4.8, date: '22 Nov, 5 PM', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85', description: 'Three stages, independent artists and an all-day celebration of new music.' },
]
