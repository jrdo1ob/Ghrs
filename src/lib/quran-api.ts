// Quran API Service - Fetches ayah text from api.alquran.cloud
// Free, reliable, and supports full tashkeel (diacritics)

export interface SurahInfo {
  number: number
  name: string
  englishName: string
  numberOfAyahs: number
}

export interface AyahText {
  number: number
  text: string
  numberInSurah: number
}

export interface SurahData {
  number: number
  name: string
  englishName: string
  numberOfAyahs: number
  ayahs: AyahText[]
}

// Juz Amma surah list (78-114)
export const JUZ_AMMA: SurahInfo[] = [
  { number: 78, name: 'النَّبَأ', englishName: 'An-Naba', numberOfAyahs: 40 },
  { number: 79, name: 'النَّازِعَات', englishName: 'An-Naziat', numberOfAyahs: 46 },
  { number: 80, name: 'عَبَسَ', englishName: 'Abasa', numberOfAyahs: 42 },
  { number: 81, name: 'التَّكْوِير', englishName: 'At-Takwir', numberOfAyahs: 29 },
  { number: 82, name: 'الانفِطَار', englishName: 'Al-Infitar', numberOfAyahs: 19 },
  { number: 83, name: 'المُطَفِّفِين', englishName: 'Al-Mutaffifin', numberOfAyahs: 36 },
  { number: 84, name: 'الانشِقَاق', englishName: 'Al-Inshiqaq', numberOfAyahs: 25 },
  { number: 85, name: 'البُرُوج', englishName: 'Al-Buruj', numberOfAyahs: 22 },
  { number: 86, name: 'الطَّارِق', englishName: 'At-Tariq', numberOfAyahs: 17 },
  { number: 87, name: 'الأَعْلَى', englishName: 'Al-Ala', numberOfAyahs: 19 },
  { number: 88, name: 'الغَاشِيَة', englishName: 'Al-Ghashiyah', numberOfAyahs: 26 },
  { number: 89, name: 'الفَجْر', englishName: 'Al-Fajr', numberOfAyahs: 30 },
  { number: 90, name: 'البَلَد', englishName: 'Al-Balad', numberOfAyahs: 20 },
  { number: 91, name: 'الشَّمْس', englishName: 'Ash-Shams', numberOfAyahs: 15 },
  { number: 92, name: 'اللَّيْل', englishName: 'Al-Layl', numberOfAyahs: 21 },
  { number: 93, name: 'الضُّحَى', englishName: 'Ad-Duhaa', numberOfAyahs: 11 },
  { number: 94, name: 'الشَّرْح', englishName: 'Ash-Sharh', numberOfAyahs: 8 },
  { number: 95, name: 'التِّين', englishName: 'At-Tin', numberOfAyahs: 8 },
  { number: 96, name: 'العَلَق', englishName: 'Al-Alaq', numberOfAyahs: 19 },
  { number: 97, name: 'القَدْر', englishName: 'Al-Qadr', numberOfAyahs: 5 },
  { number: 98, name: 'البَيِّنَة', englishName: 'Al-Bayyinah', numberOfAyahs: 8 },
  { number: 99, name: 'الزَّلْزَلَة', englishName: 'Az-Zalzalah', numberOfAyahs: 8 },
  { number: 100, name: 'العَادِيَات', englishName: 'Al-Adiyat', numberOfAyahs: 11 },
  { number: 101, name: 'القَارِعَة', englishName: 'Al-Qariah', numberOfAyahs: 11 },
  { number: 102, name: 'التَّكَاثُر', englishName: 'At-Takathur', numberOfAyahs: 8 },
  { number: 103, name: 'العَصْر', englishName: 'Al-Asr', numberOfAyahs: 3 },
  { number: 104, name: 'الهُمَزَة', englishName: 'Al-Humazah', numberOfAyahs: 9 },
  { number: 105, name: 'الفِيل', englishName: 'Al-Fil', numberOfAyahs: 5 },
  { number: 106, name: 'قُرَيْش', englishName: 'Quraysh', numberOfAyahs: 4 },
  { number: 107, name: 'المَاعُون', englishName: 'Al-Maun', numberOfAyahs: 7 },
  { number: 108, name: 'الكَوْثَر', englishName: 'Al-Kawthar', numberOfAyahs: 3 },
  { number: 109, name: 'الكَافِرُون', englishName: 'Al-Kafirun', numberOfAyahs: 6 },
  { number: 110, name: 'النَّصْر', englishName: 'An-Nasr', numberOfAyahs: 3 },
  { number: 111, name: 'المَسَد', englishName: 'Al-Masad', numberOfAyahs: 5 },
  { number: 112, name: 'الإخْلَاص', englishName: 'Al-Ikhlas', numberOfAyahs: 4 },
  { number: 113, name: 'الفَلَق', englishName: 'Al-Falaq', numberOfAyahs: 5 },
  { number: 114, name: 'النَّاس', englishName: 'An-Nas', numberOfAyahs: 6 },
]

// Fetch surah data from Quran API (Uthmani script with tashkeel)
export async function fetchSurahAyahs(surahNumber: number): Promise<SurahData> {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`)
  if (!res.ok) throw new Error(`Failed to fetch surah ${surahNumber}`)
  const data = await res.json()
  if (data.code !== 200) throw new Error(data.status || 'API error')

  return {
    number: data.data.number,
    name: data.data.name,
    englishName: data.data.englishName,
    numberOfAyahs: data.data.numberOfAyahs,
    ayahs: data.data.ayahs.map((a: any) => ({
      number: a.number,
      text: a.text,
      numberInSurah: a.numberInSurah,
    })),
  }
}

// Fetch specific ayah range from a surah
export async function fetchAyahRange(
  surahNumber: number,
  fromAyah: number,
  toAyah: number
): Promise<{ text: string; ayahs: AyahText[] }> {
  const surah = await fetchSurahAyahs(surahNumber)
  const filtered = surah.ayahs.filter(
    (a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah
  )
  return {
    text: filtered.map((a) => a.text).join('\n\n'),
    ayahs: filtered,
  }
}

// Get surah info by number
export function getSurahInfo(number: number): SurahInfo | undefined {
  return JUZ_AMMA.find((s) => s.number === number)
}
