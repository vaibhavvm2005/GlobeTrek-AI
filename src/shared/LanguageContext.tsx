import React, { createContext, useContext, useState } from 'react'

export type Language = 'en' | 'hi' | 'kn'

export interface Translations {
  brandName: string
  tagline: string
  heroHeadline: string
  heroSubtitle: string
  searchPlaceholder: string
  locationPlaceholder: string
  exploreButton: string
  popularSuggestions: string
  navDiscover: string
  navDestinations: string
  navEvents: string
  navExperiences: string
  navConcierge: string
  navMyBookings: string
  navMyTickets: string
  navTripPlanner: string
  navWishlist: string
  navProfile: string
  navLogin: string
  navAdminPortal: string
  categoriesKicker: string
  categoriesHeading: string
  trendingHeading: string
  curatedDestinations: string
  aiBannerKicker: string
  aiBannerTitle: string
  aiBannerDesc: string
  askWayfarer: string
  bookNow: string
  onwards: string
  checkAvailability: string
  freeCancellation: string
  totalPrice: string
  ticketTier: string
  visitors: string
  offlineBanner: string
  downloadTicket: string
  verifiedDatabase: string
}

const DICTIONARY: Record<Language, Translations> = {
  en: {
    brandName: 'WAYFARER',
    tagline: 'Curated Journeys Across India',
    heroHeadline: 'Find your next unforgettable experience.',
    heroSubtitle: 'Discover remarkable destinations, local experiences and events. Let your next journey begin here.',
    searchPlaceholder: 'Museums, classical concerts, treks, exhibitions...',
    locationPlaceholder: 'Bengaluru, Hampi, Mumbai...',
    exploreButton: 'Search & Explore',
    popularSuggestions: 'Popular discoveries:',
    navDiscover: 'Discover',
    navDestinations: 'Destinations',
    navEvents: 'Events',
    navExperiences: 'Experiences',
    navConcierge: 'AI Concierge',
    navMyBookings: 'My Bookings',
    navMyTickets: 'Ticket Wallet',
    navTripPlanner: 'Trip Planner',
    navWishlist: 'Saved',
    navProfile: 'Profile',
    navLogin: 'Sign In',
    navAdminPortal: 'Wayfarer Control',
    categoriesKicker: 'COLLECTIONS BY INTEREST',
    categoriesHeading: 'Find your kind of experience',
    trendingHeading: 'Trending experiences worth discovering',
    curatedDestinations: 'Iconic destinations & heritage gateways',
    aiBannerKicker: 'INTELLIGENT TRAVEL CONCIERGE',
    aiBannerTitle: 'More than a search box. A conversation.',
    aiBannerDesc: 'Plan your itinerary, check verified inventory, and reserve in your natural voice across English, Hindi, or Kannada.',
    askWayfarer: 'Consult AI Concierge',
    bookNow: 'Book Experience',
    onwards: 'onwards',
    checkAvailability: 'Check availability & book',
    freeCancellation: 'Free cancellation up to 24 hours prior',
    totalPrice: 'Total Amount',
    ticketTier: 'Ticket Category',
    visitors: 'Number of Visitors',
    offlineBanner: 'Offline Mode: You can view all saved and confirmed digital tickets without internet.',
    downloadTicket: 'Download Pass (PDF / Print)',
    verifiedDatabase: '100% Verified Real-Time Inventory',
  },
  hi: {
    brandName: 'वेफ़ेयरर',
    tagline: 'भारत भर में चुनिंदा यात्रा अनुभव',
    heroHeadline: 'अपने अगले अविस्मरणीय अनुभव की खोज करें।',
    heroSubtitle: 'अद्भुत पर्यटन स्थल, स्थानीय सांस्कृतिक कार्यक्रम और संग्रहालय खोजें। अपनी यात्रा यहाँ से शुरू करें।',
    searchPlaceholder: 'संग्रहालय, शास्त्रीय संगीत, ट्रेक, प्रदर्शनियाँ...',
    locationPlaceholder: 'बेंगलुरु, हम्पी, मुंबई...',
    exploreButton: 'खोजें और देखें',
    popularSuggestions: 'लोकप्रिय खोजें:',
    navDiscover: 'खोजें',
    navDestinations: 'गंतव्य',
    navEvents: 'कार्यक्रम',
    navExperiences: 'अनुभव',
    navConcierge: 'AI सहायक',
    navMyBookings: 'मेरी बुकिंग्स',
    navMyTickets: 'टिकट वॉलेट',
    navTripPlanner: 'यात्रा योजना',
    navWishlist: 'सहेजे गए',
    navProfile: 'प्रोफ़ाइल',
    navLogin: 'लॉग इन',
    navAdminPortal: 'कंट्रोल सेंटर',
    categoriesKicker: 'रुचि के अनुसार संग्रह',
    categoriesHeading: 'अपनी पसंद का अनुभव चुनें',
    trendingHeading: 'वर्तमान में लोकप्रिय अनुभव',
    curatedDestinations: 'प्रतिष्ठित ऐतिहासिक और प्राकृतिक गंतव्य',
    aiBannerKicker: 'स्मार्ट AI यात्रा सहायक',
    aiBannerTitle: 'केवल खोज नहीं, एक बातचीत।',
    aiBannerDesc: 'अपनी भाषा में प्रश्न पूछें, वास्तविक इन्वेंट्री जांचें और हिंदी, अंग्रेजी या कन्नड़ में सहजता से टिकट बुक करें।',
    askWayfarer: 'AI सहायक से पूछें',
    bookNow: 'अभी बुक करें',
    onwards: 'से शुरू',
    checkAvailability: 'उपलब्धता देखें और बुक करें',
    freeCancellation: '24 घंटे पूर्व निःशुल्क रद्दीकरण',
    totalPrice: 'कुल राशि',
    ticketTier: 'टिकट श्रेणी',
    visitors: 'आगंतुकों की संख्या',
    offlineBanner: 'ऑफलाइन मोड: आप बिना इंटरनेट के भी अपने जारी किए गए डिजिटल टिकट देख सकते हैं।',
    downloadTicket: 'पास डाउनलोड करें (PDF / प्रिंट)',
    verifiedDatabase: '100% सत्यापित वास्तविक समय इन्वेंट्री',
  },
  kn: {
    brandName: 'ವೇಫೇರರ್',
    tagline: 'ಭಾರತದಾದ್ಯಂತ ಆಯ್ದ ಅದ್ಭುತ ಪ್ರವಾಸಗಳು',
    heroHeadline: 'ನಿಮ್ಮ ಮುಂದಿನ ಅವಿಸ್ಮರಣೀಯ ಅನುಭವವನ್ನು ಕಂಡುಕೊಳ್ಳಿ.',
    heroSubtitle: 'ಅತ್ಯುತ್ತಮ ಪ್ರವಾಸಿ ತಾಣಗಳು, ಸ್ಥಳೀಯ ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ ಕೇಂದ್ರಗಳನ್ನು ಅನ್ವೇಷಿಸಿ.',
    searchPlaceholder: 'ವಸ್ತುಸಂಗ್ರಹಾಲಯಗಳು, ಸಂಗೀತ ಕಚೇರಿಗಳು, ಚಾರಣಗಳು...',
    locationPlaceholder: 'ಬೆಂಗಳೂರು, ಹಂಪಿ, ಮುಂಬೈ...',
    exploreButton: 'ಹುಡುಕಿ ಮತ್ತು ಅನ್ವೇಷಿಸಿ',
    popularSuggestions: 'ಜನಪ್ರಿಯ ಹುಡುಕಾಟಗಳು:',
    navDiscover: 'ಅನ್ವೇಷಿಸಿ',
    navDestinations: 'ತಾಣಗಳು',
    navEvents: 'ಕಾರ್ಯಕ್ರಮಗಳು',
    navExperiences: 'ಅನುಭವಗಳು',
    navConcierge: 'AI ಸಹಾಯಕ',
    navMyBookings: 'ನನ್ನ ಬುಕಿಂಗ್‌ಗಳು',
    navMyTickets: 'ಟಿಕೆಟ್ ವಾಲೆಟ್',
    navTripPlanner: 'ಪ್ರವಾಸ ಯೋಜನೆ',
    navWishlist: 'ಮೆಚ್ಚಿನವುಗಳು',
    navProfile: 'ಪ್ರೊಫೈಲ್',
    navLogin: 'ಲಾಗಿನ್',
    navAdminPortal: 'ನಿಯಂತ್ರಣ ಕೇಂದ್ರ',
    categoriesKicker: 'ಆಸಕ್ತಿಗೆ ತಕ್ಕ ಸಂಗ್ರಹಗಳು',
    categoriesHeading: 'ನಿಮ್ಮಿಷ್ಟದ ಅನುಭವವನ್ನು ಆರಿಸಿ',
    trendingHeading: 'ಪ್ರಸ್ತುತ ಜನಪ್ರಿಯ ಅನುಭವಗಳು',
    curatedDestinations: 'ಐತಿಹಾಸಿಕ ಹಾಗೂ ಸುಂದರ ಪ್ರವಾಸಿ ತಾಣಗಳು',
    aiBannerKicker: 'ಬುದ್ಧಿವಂತ AI ಪ್ರವಾಸ ಸಹಾಯಕ',
    aiBannerTitle: 'ಕೇವಲ ಹುಡುಕಾಟವಲ್ಲ. ಒಂದು ಸಂವಾದ.',
    aiBannerDesc: 'ನಿಮ್ಮ ಸ್ವಂತ ಭಾಷೆಯಲ್ಲಿ ಪ್ರಯಾಣ ಯೋಜಿಸಿ, ನೈಜ ಲಭ್ಯತೆ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸುಲಭವಾಗಿ ಟಿಕೆಟ್ ಕಾಯ್ದಿರಿಸಿ.',
    askWayfarer: 'AI ಸಹಾಯಕನಿಗೆ ಕೇಳಿ',
    bookNow: 'ಈಗಲೇ ಬುಕ್ ಮಾಡಿ',
    onwards: 'ಪ್ರಾರಂಭಿಕ ಬೆಲೆ',
    checkAvailability: 'ಲಭ್ಯತೆ ನೋಡಿ ಬುಕ್ ಮಾಡಿ',
    freeCancellation: '24 ಗಂಟೆ ಮುನ್ನ ಉಚಿತ ರದ್ದತಿ ಲಭ್ಯ',
    totalPrice: 'ಒಟ್ಟು ಮೊತ್ತ',
    ticketTier: 'ಟಿಕೆಟ್ ವರ್ಗ',
    visitors: 'ಸಂದರ್ಶಕರ ಸಂಖ್ಯೆ',
    offlineBanner: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್: ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆಯೂ ನೀವು ದೃಢೀಕರಿಸಿದ ಟಿಕೆಟ್‌ಗಳನ್ನು ವೀಕ್ಷಿಸಬಹುದು.',
    downloadTicket: 'ಪಾಸ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ (PDF / ಪ್ರಿಂಟ್)',
    verifiedDatabase: '100% ದೃಢೀಕೃತ ನೈಜ ದಾಸ್ತಾನು',
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('wayfarer_language')
    return (saved as Language) || 'en'
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('wayfarer_language', lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: DICTIONARY[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

