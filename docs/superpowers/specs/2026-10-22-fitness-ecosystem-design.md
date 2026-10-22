# Fitness Ekosistemi — Dizayn Sənədi

Tarix: 2026-10-22
Status: istifadəçinin təsdiqini gözləyir

> Qeyd: "**[Claude-un seçimi]**" ilə işarələnən yerlər istifadəçinin deyil, mənim qərarımdır və dəyişdirilə bilər. İşarəsiz qərarlar istifadəçinin öz sözləridir.

---

## 1. Niyyət və səbəb

İstifadəçi 1 aydır **evdə** idman edir (split proqramı; bədən çəkisi, dumbbell, turnik və iki çarpayıdan düzəldilmiş paralel qol). Proqram iki məqsədə xidmət edir:

1. **Real alət:** özü, dostları və tanışları üçün — məşq zamanı hər hərəkətdən **real** nə etdiyini qeyd etmək və inkişafını gözlə görmək.
2. **Öyrənmə layihəsi:** AI ilə proqram qurmağı öyrənmək və bacarıqlarını, xüsusən **DevOps** tərəfini inkişaf etdirmək. Layihənin necə qurulduğu (konteynerlər, CI/CD, server idarəçiliyi) də nəticənin bir hissəsidir. İstifadəçi indiki mərhələdə mürəkkəb həllər istəmir — sadə, işləyən sistem.

İstifadəçinin təcrübəsi dizayna təsir edir: ilk gün limitlərini zorlayıb günlərlə keçməyən əzələ ağrısı yaşadı, bir həftə ara verdi, sonra ehtiyatlı rəqəmlərlə və kiçik artımlarla davam etdi — hamısını "hissiyatla", qeydsiz etdi. Əvvəlki AI layihəsində "4×10, 60 kq" kimi yuxarıdan qoyulan rəqəmlər onun real stilinə uyğun gəlmədi.

**Əsas prinsip:** həftəlik cədvəl yalnız **plandır** (hansı gün hansı hərəkətlər, hansı quruluşda). Dəyərli olan **real** qeyd olunan nəticədir. Qrafiklər, kalori və gələcəkdə hədəf sistemi bu real qeydlərdən qurulur.

## 2. Hədəflər, qeyri-hədəflər, anti-hədəflər

### Hədəflər (Mərhələ 1 — Web)
- Landing page → qeydiyyat (hamıya açıq) → şəxsi kabinet.
- Bədən məlumatları və gündəlik kalori ehtiyacı.
- Həftəlik split cədvəl: gün → əzələ qrupları → hərəkətlər, **zəncirlər** (bax §5.5), bir günü başqa günə kopyalamaq.
- Əsas menyuda bu günün məşqi.
- Məşq zamanı real qeyd + timer.
- İnkişaf qrafikləri.
- **2D** ön/arxa əzələ xəritəsi: əzələyə klik → o əzələnin hərəkətləri (MuscleWiki məntiqi).
- Məşqə görə təxmini yandırılan kalori.
- Web-app AZ + EN; admin panel yalnız AZ.
- Admin panel: istifadəçilər və hərəkət bazası.
- Hamısı istifadəçinin serverində Docker konteynerlərində, öz domenlərində.

### Qeyri-hədəflər (Mərhələ 1-də YOX)
- **3D bədən modeli** (GymVisual vizuallığı ilə) — sonrakı mərhələ; 2D xəritə əvəz edilə biləcək şəkildə qurulur.
- Fityemek "Superman paketi" kimi **hədəf sistemi** (keçən nəticəyə görə növbəti məşq üçün təklif) — Mərhələ 2. Məlumat modeli buna imkan verməlidir.
- Full body və push-pull üçün ayrıca məntiqlər — Mərhələ 2.
- Offline rejim (istifadəçi evdə məşq edir, internet var).
- Serverdən kənar backup, server resursunun artırılması.
- Mobil app — Mərhələ 3, eyni API üzərində.
- Qidalanma, sosial funksiyalar, ödəniş, ağıllı saat inteqrasiyası.

### Anti-hədəflər
- İstifadəçiyə yuxarıdan "bu qədər et" deyən rəqəmlər qoyub onu həddindən artıq yüklənməyə itələmək.
- Məşq zamanı qeyd etməyin yavaş/çətin olması (telefonda, setlər/dövrələr arası qısa fasilədə). Kağızdan çətindirsə, proqram uğursuzdur.
- Kalori rəqəmlərinin dəqiq kimi göstərilməsi — həmişə "təxmini".
- Qeyd olunmuş məşq tarixçəsinin deploy və ya miqrasiya zamanı itməsi.

## 3. Məhdudiyyətlər

- **Server:** `206.189.185.233` (DigitalOcean, 1 vCPU, 1 GB RAM + 1 GB swap, ~18 GB boş disk, Docker 29, SSH root açarla). Resurs artırılmır.
- **Domenlər** (Cloudflare, DNS-only, serverə yönəlib):
  - Web-app: `fit2.chairops.online`
  - Admin panel: `ad2.chairops.online`
- **Köhnə layihə** `/opt/fitness`-də işləyir və 80/443 portlarını tutur. Köhnə bazada real məşq məlumatı yoxdur (2 istifadəçi, 1 test proqram, 0 məşq) — yeni sistemə köçürmə lazım deyil. İstifadəçinin icazəsi ilə: yeni layihə qalxmazdan əvvəl köhnə layihənin faylları (`/opt/fitness`) və bazası (`pg_dump`) istifadəçinin kompüterinə arxiv kimi endirilir, arxivin açıldığı yoxlanılır, sonra serverdə köhnə konteynerlər, volume-lar, image-lər və qovluq silinir.
- 1 GB RAM səbəbindən serverdə build edilmir — image-lər CI-da build olunur.
- İstifadəçi kütləsi kiçikdir (onlarla nəfər).

## 4. Necə qurulur

### İstifadəçinin qərarları
- Üç hissə: Web-app, Mobil app (sonra), Admin panel. Əvvəlcə web.
- Docker konteynerlərində, yuxarıdakı server və domenlərdə.
- Dillər: web AZ+EN, admin AZ.
- Texnologiyaları Claude seçir; mürəkkəb həllər indi lazım deyil.

### Texnologiya yığını [Claude-un seçimi]
| Hissə | Seçim |
|---|---|
| Dil | TypeScript |
| Monorepo | pnpm workspaces + Turborepo |
| Web-app + Admin | **Bir** Next.js (App Router) tətbiqi. `ad2.*` host-u ilə girəndə admin bölməsi, `fit2.*` ilə kabinet açılır (yaddaşa qənaət üçün). `next-intl` ilə AZ/EN |
| API | NestJS (REST) — web və gələcək mobil app eyni API-ni işlədir |
| Verilənlər bazası | PostgreSQL + Prisma |
| 2D əzələ xəritəsi | Kliklənən SVG (ön/arxa), hər əzələ qrupu ayrıca `path` |
| Qrafiklər | Recharts |
| Ortaq kod | `packages/shared` (tiplər, zod sxemləri, kalori/1RM hesablamaları) |
| Mobil (Mərhələ 3) | React Native (Expo) |

### Repo strukturu [Claude-un seçimi]
```
apps/web      — landing + kabinet + admin (fit2 / ad2)
apps/api      — NestJS API
packages/db   — Prisma sxemi, miqrasiyalar, seed
packages/shared
deploy/       — docker-compose.prod.yml, Caddyfile, backup skripti
docs/
```

### İnfrastruktur [Claude-un seçimi]
- **Lokal:** `docker compose up` ilə bütün sistem bir əmrlə.
- **Prod konteynerləri:** `caddy`, `web`, `api`, `db` — server qovluğu `/opt/fitness2`.
- **Caddy:** hər iki domen üçün avtomatik HTTPS, reverse proxy; API `/api` yolu ilə eyni domendən açılır.
- **CI/CD:** GitHub Actions — push-da lint + test; `main`-ə push-da image-lər build olunub GHCR-a göndərilir, SSH ilə serverdə `docker compose pull && up -d` + Prisma miqrasiyaları. GitHub reposu istifadəçinin hesabında yaradılacaq.
- Hər konteynerə yaddaş limiti; Next.js `standalone` build.
- **Backup:** hər gecə `pg_dump` serverdə, son 7 gün (serverdən kənar backup yoxdur — istifadəçinin qərarı).
- Sirlər serverdə `.env` faylında; GitHub Secrets-də SSH açarı.
- Hər addım `docs/`-da qısa runbook kimi.

## 5. Funksiyalar (Mərhələ 1)

### 5.1 Landing page
Tanışlıq, əsas funksiyalar, "Qeydiyyat" / "Daxil ol", AZ/EN seçimi.

### 5.2 Qeydiyyat və giriş
- Hamıya açıq. E-poçt + şifrə, sessiya httpOnly cookie ilə. **[Claude-un seçimi]** E-poçt təsdiqi yoxdur; şifrəni admin sıfırlayır; qeydiyyat endpoint-inə sadə rate-limit.

### 5.3 Bədən məlumatları və kalori
- Qeydiyyatdan sonra: cins, doğum tarixi, boy (sm), çəki (kq), məşqdən kənar aktivlik səviyyəsi. Çəki dəyişiklikləri tarixçə kimi saxlanılır.
- **Gündəlik kalori ehtiyacı** [Claude-un seçimi]: Mifflin-St Jeor BMR × aktivlik əmsalı = baza. Həmin gün məşq olubsa, onun təxmini kalorisi əlavə olunur (ehtiyac məşqə görə yenilənir — istifadəçinin istəyi).
- **Məşq kalorisi** [Claude-un seçimi]: MET × bədən çəkisi (kq) × məşq müddəti (saat), güc/kalistenika məşqi üçün MET ≈ 5. Həmişə "təxmini".

### 5.4 Hərəkət bazası
- Hər hərəkət: ad AZ/EN, təsvir, şəkil, əsas/köməkçi əzələ qrupları, avadanlıq (bədən çəkisi, dumbbell, turnik, paralel qol, zal avadanlığı...), **ölçü növü**:
  - `reps_weight` — təkrar + kq (dumbbell hərəkətləri)
  - `reps` — yalnız təkrar (jim, pull-up, sit-up, flutter kicks)
  - `time` — saniyə (plank)
- **İlkin baza:**
  1. İstifadəçinin öz hərəkətləri əl ilə, AZ/EN adlarla (aşağıdakı cədvəl).
  2. **[Claude-un seçimi]** Əlavə olaraq açıq lisenziyalı ümumi baza (`free-exercise-db`, public domain, ~800 hərəkət, şəkilli) — dostlar öz hərəkətlərini tapsın. AZ adlar admin paneldən tədricən; AZ yoxdursa EN göstərilir. Avadanlıq filtri.

**İstifadəçinin hərəkətləri (seed):**

| EN | AZ | Əzələ | Avadanlıq | Ölçü |
|---|---|---|---|---|
| Push-Up | Jim | Sinə (triceps, ön çiyin) | Bədən çəkisi | reps |
| Incline Push-Up | Incline jim | Sinə (aşağı) | Bədən çəkisi | reps |
| Decline Push-Up | Decline jim | Sinə (yuxarı) | Bədən çəkisi | reps |
| Diamond Push-Up | Diamond jim | Sinə, Triceps | Bədən çəkisi | reps |
| Overhead Dumbbell Triceps Extension | Baş üstü dumbbell triceps uzatma | Triceps | Dumbbell | reps_weight |
| Wrist Curl | Bilək bükmə | Bilək | Dumbbell | reps_weight |
| Wrist Extension | Bilək açma | Bilək | Dumbbell | reps_weight |
| Hammer Curl | Hammer curl | Bilək, Biceps | Dumbbell | reps_weight |
| Lateral Raise | Yana qaldırma | Çiyin | Dumbbell | reps_weight |
| Dumbbell Squat | Dumbbell ilə squat (çömbəlmə) | Ayaq | Dumbbell | reps_weight |
| Dumbbell Calf Raise | Dumbbell ilə baldır qaldırma | Ayaq (baldır) | Dumbbell | reps_weight |
| Dip Shrug (Scapular Dip) | Dips shrug | Traps | Paralel qol | reps |
| Pull-Up | Turnikdə dartınma | Bel (biceps) | Turnik | reps |
| Biceps Curl | Biceps curl | Biceps | Dumbbell | reps_weight |
| Plank | Plank | Qarın | Bədən çəkisi | time |
| Bent-Knee Sit-Up | Dizi bükülü sit-up | Qarın | Bədən çəkisi | reps |
| Flutter Kicks | Flutter kicks | Qarın (aşağı) | Bədən çəkisi | reps |

Bütün jim variantları bədən çəkisi ilədir; squat və calf raise dumbbell ilə edilir. AZ adlar **[Claude-un seçimi]** — istifadəçi admin paneldən düzəldə bilər.

### 5.5 Program Yarat (həftəlik split cədvəl)
1. Həftəlik cədvəl açılır (B.e – Bazar).
2. Hər gün üçün əzələ qrupları seçilir və ya gün "istirahət" qeyd olunur.
3. Hər əzələ qrupu üçün hərəkətlər seçilir, sıra dəyişdirilə bilər.
4. **Zəncirlər:** bir neçə hərəkət bir **zəncirə** birləşdirilə bilər (istifadəçinin yazılışında `/`). Zəncirdəki hərəkətlər fasiləsiz, ardıcıl edilir və birlikdə bir **dövrə** sayılır. Zəncir üçün: zəncirdaxili fasilə (məs. 0 və ya 10 san) və dövrələr arası istirahət (məs. 2 dəq). Ayrıca hərəkət (`,`) üçün: setlər arası istirahət. Bu fasilə dəyərləri plan elementinin ayarıdır və timer-i idarə edir.
5. **Bir günün proqramını başqa gün(lər)ə kopyalamaq** (məs. Day 1 → Day 4).
6. "Cədvəli tamamla" → əsas menyu.

Cədvəldə set/təkrar/çəki rəqəmləri **yoxdur** (istifadəçinin qərarı). Bir aktiv cədvəl; köhnələr arxivdə qalır.

İstifadəçinin indiki cədvəli nümunə kimi (yeni istifadəçilər üçün şablon da ola bilər **[Claude-un seçimi]**):
- **Day 1 / 4:** Sinə → zəncir [Jim / Incline / Decline / Diamond], zəncirdaxili 10 san · Triceps → Overhead extension · Bilək → zəncir [Wrist curl / Wrist extension], sonra ayrıca Hammer curl
- **Day 2 / 5:** Çiyin → Lateral raise · Ayaq → Squat, ayrıca Calf raise · Traps → Dip shrug
- **Day 3 / 6:** Bel → Pull-up · Biceps → Biceps curl · Qarın → Plank, sonra zəncir [Bent-knee sit-up / Flutter kicks]

### 5.6 Əsas menyu — bugünkü məşq
- Həftə gününə görə həmin günün planı (istirahət günüdürsə, bu yazılır).
- "Məşqə başla" → qeyd ekranı. **[Claude-un seçimi]** Başqa günün məşqini və ya plansız sərbəst məşq başlatmaq da mümkündür.
- Qısa xülasə: bu həftə neçə məşq, bugünkü kalori ehtiyacı.

### 5.7 Məşqin qeydi (ən vacib ekran)
- **Ayrıca hərəkət:** setlər bir-bir əlavə olunur — hərəkətin ölçü növünə görə təkrar, təkrar + kq və ya saniyə; istəyə görə **hiss: asan / normal / çətin**.
- **Zəncir:** bir blok kimi göstərilir; hər **dövrə** üçün zəncirdəki hər hərəkətin dəyəri bir sətirdə yazılır (məs. dövrə 1: 5 / 5 / 5 / 5).
- **[Claude-un seçimi]** Yeni set/dövrə sahələri əvvəlki dəyərlərlə əvvəlcədən dolur — çox vaxt "təsdiq" basmaq kifayətdir. Yanında "keçən dəfə: ..." göstərilir (hədəf kimi yox, məlumat kimi).
- Bu sessiyaya hərəkət əlavə etmək/çıxarmaq mümkündür (plana təsir etmir).
- Telefon brauzerində rahat: böyük düymələr, minimum yazma.
- Hər set/dövrə dərhal serverə yazılır; səhifə yenilənəndə sessiya davam edir (offline rejim yoxdur).
- "Məşqi bitir" → xülasə: müddət, ümumi həcm, təxmini kalori, keçən dəfəyə görə yaxşılaşmalar.

### 5.8 Timer
- **İstirahət timeri** plan elementinin fasiləsinə görə avtomatik işləyir:
  - Zəncirdə: hərəkətlər arasında zəncirdaxili fasilə (məs. 10 san; 0-dırsa timer yoxdur), dövrə bitəndə dövrələr arası istirahət (məs. 2 dəq).
  - Ayrıca hərəkətdə: set qeyd olunanda setlər arası istirahət.
  - Default dəyər istifadəçi ayarlarında (90 san); hər dəfə dəyişmək olar. Bitəndə səs/vibrasiya (brauzer icazə verirsə).
- **Plank kimi vaxt hərəkətləri** üçün geri sayan/irəli sayan saniyəölçən; nəticə avtomatik set kimi yazılır.
- **Məşq müddəti saniyəölçəni** sessiya boyu görünür (kalori hesabı üçün).

### 5.9 İnkişaf qrafikləri
- Hər hərəkət üçün, ölçü növünə görə:
  - `reps_weight`: ən ağır set, təxmini 1RM (Epley), sessiya həcmi (təkrar × kq)
  - `reps`: sessiyada ən çox təkrar və ümumi təkrar sayı
  - `time`: ən uzun və ümumi vaxt
- Zəncirlər üçün: hər dövrənin ümumi təkrar sayı.
- Əzələ qrupu üzrə həftəlik həcm (set/dövrə sayı).
- Bədən çəkisi tarixçəsi, məşq tezliyi.

### 5.10 2D əzələ xəritəsi
- Ön və arxa bədən görünüşü (SVG); əzələ qrupları hover-də işıqlanır, klikdə o əzələnin hərəkətləri səhifəsinə keçir (MuscleWiki məntiqi).
- **[Claude-un seçimi]** Komponent elə qurulur ki, gələcəkdə eyni əzələ qrupu id-ləri ilə 3D modellə (GymVisual vizuallığı) əvəz olunsun.

### 5.11 Admin panel (ad2.chairops.online, yalnız AZ)
- Yalnız `admin` rolu olanlar. İlk admin seed/CLI ilə yaradılır.
- **İstifadəçilər:** siyahı, axtarış, profil və aktivlik (son məşq, məşq sayı), bloklamaq/açmaq, şifrəni sıfırlamaq, silmək.
- **Hərəkət bazası:** hərəkət və əzələ qruplarını yaratmaq/redaktə/silmək, AZ/EN adlar, ölçü növü, avadanlıq, şəkil yükləmək.
- Ümumi statistika: istifadəçi sayı, aktiv istifadəçilər, bu həftəki məşqlər.

## 6. Məlumat modeli (eskiz) [Claude-un seçimi]

- `User` (email, şifrə hash, rol, dil, status)
- `Profile` (cins, doğum tarixi, boy, aktivlik, default istirahət)
- `BodyWeightEntry` (tarix, kq)
- `MuscleGroup` (ad AZ/EN, xəritə id-si)
- `Equipment`
- `Exercise` (ad AZ/EN, təsvir, şəkil, ölçü növü, avadanlıq, əsas/köməkçi əzələlər)
- `WeekPlan` (aktiv/arxiv) → `PlanDay` (həftə günü, istirahət?, əzələ qrupları) → `PlanBlock` (sıra, növ: `single` | `chain`, zəncirdaxili fasilə, set/dövrə arası istirahət) → `PlanBlockExercise` (hərəkət, sıra)
- `WorkoutSession` (user, PlanDay ref (boş ola bilər), başlama/bitmə, təxmini kalori)
- `SessionBlock` (sessiyadakı blok — plandan kopyalanır, sessiyada dəyişdirilə bilər)
- `SetEntry` (sessiya bloku, hərəkət, set/dövrə nömrəsi, təkrar?, kq?, saniyə?, hiss?, vaxt)

Zəncirin bir dövrəsi = eyni dövrə nömrəli bir neçə `SetEntry`. Mərhələ 2 hədəf sistemi üçün `SetEntry` tarixçəsi kifayətdir; `PlanBlockExercise`-a sonra hədəf sahələri əlavə olunur.

## 7. Vizual dizayn prinsipləri

İstifadəçinin tələbləri:
- **Minimum / sıfır scroll:** əsas ekranlar (bugünkü məşq, qeyd ekranı, timer, cədvəl günü) bir ekrana sığmalıdır — həm telefonda, həm desktopda. Uzun siyahılar əvəzinə tablar, addımlar, yığcam kartlar.
- **"AI hissiyatı" verməməlidir:** tipik AI-generasiya görünüşündən qaçmaq — bənövşəyi/mavi gradientlər, parıldayan "sparkle" ikonlar, hər yerdə emoji, şişirdilmiş marketinq mətnləri, eyni tipli yumru kart şəbəkələri yox.
- **Professional və funksional:** hər element bir iş görür; dekorasiya üçün dekorasiya yox. Rəqəmlər (təkrar, kq, vaxt) ekranın əsas qəhrəmanıdır.
- **Göz yormamalı, sadə, amma enerjili:** sakit, tünd əsaslı (və ya neytral açıq) fon, yüksək oxunaqlıq; enerji bir güclü vurğu rəngi ilə verilir (aktiv düymə, timer, rekord) — rəng partlayışı yox.
- **Fitness üslubu:** güclü, sıx tipoqrafiya (rəqəmlər üçün qalın, kondensə şrift), atletik ritm, qısa əmr formalı mətnlər ("Başla", "Set əlavə et").

**[Claude-un seçimi]** İcradan əvvəl 2–3 vizual istiqamət (rəng + tipoqrafiya + bir əsas ekran maketi) istifadəçiyə göstərilir və o seçir.

## 8. Builder-ə qalanlar
- Komponent kitabxanası və dizaynın detalları (§7 prinsipləri və istifadəçinin seçdiyi istiqamət daxilində).
- 2D əzələ xəritəsi SVG-sinin mənbəyi (açıq lisenziyalı və ya özü çəkilmiş).
- API endpoint-lərinin forması, validasiya.
- Test strategiyası (ən azı: kalori/1RM, cədvəl kopyalama, zəncir/set qeydi).
- Konteyner yaddaş limitləri.
- Mərhələ 1-in işlərin ardıcıllığına bölünməsi.

## 9. Mərhələlər
1. **Mərhələ 1 —** Web + Admin + İnfrastruktur (bu sənəd).
2. **Mərhələ 2 —** hədəf sistemi (Fityemek məntiqi), full body / push-pull, 3D model, e-poçt ilə şifrə bərpası.
3. **Mərhələ 3 —** Mobil app (Expo), eyni API.
