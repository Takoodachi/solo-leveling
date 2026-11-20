import type { Exercise } from '@/types'

/**
 * Built-in stretches (November 2026): static holds, logged as seconds per set with no weight
 * (type 'flexibility', see SetMode 'stretch'). A set is one hold: a stretch done one side at a
 * time takes a set per side, which its instructions say. `muscles` are the ones it stretches.
 * Merged into BUILT_IN_EXERCISES; ids are stable because logged sets and routines refer to them.
 */
function stretch(uuid: string, name: string, muscles: string[], musclesSecondary: string[], instructions: string): Exercise {
  return { uuid, name, category: 'Stretching', type: 'flexibility', defaultUnit: 'min', isCustom: false, updatedAt: 0, muscles, musclesSecondary, instructions }
}

export const STRETCHES: Exercise[] = [
  // ── Neck and upper back ─────────────────────────────────────────────
  stretch('ex-neck-side-stretch', 'Neck Side Stretch', ['Neck', 'Traps'], [], 'Sit or stand tall with your shoulders down. Tilt one ear toward that shoulder and rest the same hand lightly on your head for a little more; reach the other hand toward the floor. Switch sides for the next set.'),
  stretch('ex-upper-back-stretch', 'Upper Back Stretch', ['Upper Back', 'Rhomboids'], ['Rear Deltoid', 'Traps'], 'Clasp your hands in front of you at chest height. Round your upper back, tuck your chin and push your hands away as if hugging a big ball, letting your shoulder blades spread apart.'),
  stretch('ex-thread-the-needle', 'Thread the Needle', ['Upper Back', 'Rear Deltoid'], ['Obliques'], 'On all fours, slide one arm under your body, palm up, until that shoulder and the side of your head rest on the floor. Keep your hips over your knees. Switch sides for the next set.'),

  // ── Chest and shoulders ─────────────────────────────────────────────
  stretch('ex-doorway-chest-stretch', 'Doorway Chest Stretch', ['Chest'], ['Anterior Deltoid', 'Biceps'], 'Stand in a doorway with your forearms on the frame, elbows at shoulder height. Step one foot through and lean forward gently until the stretch spreads across your chest. Raise the elbows a little to reach the lower chest.'),
  stretch('ex-clasped-hands-chest-opener', 'Clasped-Hands Chest Opener', ['Chest', 'Anterior Deltoid'], ['Biceps'], 'Clasp your hands behind your back with your arms straight. Squeeze your shoulder blades together and lift your hands away from your body, chest up. Hold a towel between your hands if they don\'t meet.'),
  stretch('ex-cross-body-shoulder-stretch', 'Cross-Body Shoulder Stretch', ['Rear Deltoid'], ['Upper Back', 'Rotator Cuff'], 'Bring one straight arm across your chest and hold it above the elbow with the other hand. Pull it closer while keeping that shoulder down, away from your ear. Switch arms for the next set.'),
  stretch('ex-sleeper-stretch', 'Sleeper Stretch', ['Rotator Cuff'], ['Rear Deltoid'], 'Lie on one side with that arm out in front at shoulder height and the elbow bent to 90°, fingers up. With the other hand, ease the forearm down toward the floor until the back of the shoulder stretches; stop short of any pinch. Switch sides for the next set.'),
  stretch('ex-biceps-wall-stretch', 'Biceps Wall Stretch', ['Biceps'], ['Chest', 'Anterior Deltoid'], 'Put one palm flat on a wall at shoulder height, arm straight and fingers pointing back. Slowly turn your body away from the wall until the front of the arm and shoulder stretch. Switch arms for the next set.'),

  // ── Arms and wrists ─────────────────────────────────────────────────
  stretch('ex-overhead-triceps-stretch', 'Overhead Triceps Stretch', ['Triceps'], ['Lats'], 'Raise one arm, bend the elbow and drop your hand behind your head toward the opposite shoulder blade. Use the other hand to ease the elbow back and down. Switch arms for the next set.'),
  stretch('ex-wrist-flexor-stretch', 'Wrist Flexor Stretch', ['Forearms'], [], 'Hold one arm straight out in front, palm up. With the other hand, gently pull the fingers down and back until the inside of the forearm stretches. Switch hands for the next set.'),
  stretch('ex-wrist-extensor-stretch', 'Wrist Extensor Stretch', ['Forearms'], [], 'Hold one arm straight out in front, palm down. With the other hand, bend the wrist down, drawing the back of the hand toward you, until the top of the forearm stretches. Switch hands for the next set.'),

  // ── Back and core ───────────────────────────────────────────────────
  stretch('ex-childs-pose', 'Child\'s Pose', ['Lats', 'Lower Back'], ['Glutes', 'Shoulders'], 'Kneel, sit back toward your heels and walk your hands forward until your forehead rests on the floor. Widen your knees for more room, and walk both hands to one side to stretch the other side of your back.'),
  stretch('ex-kneeling-lat-stretch', 'Kneeling Lat Stretch', ['Lats'], ['Triceps', 'Chest'], 'Kneel facing a bench with your elbows on it and your hands together. Sit your hips back and let your chest sink toward the floor until the sides of your back stretch.'),
  stretch('ex-cat-cow', 'Cat-Cow', ['Lower Back', 'Abs'], ['Upper Back'], 'On all fours, slowly round your back up toward the ceiling, tucking your chin and tailbone, then let your belly sink as you lift your chest and tailbone. Keep moving between the two with your breath for the time set.'),
  stretch('ex-cobra-stretch', 'Cobra Stretch', ['Abs'], ['Hip Flexors', 'Chest'], 'Lie face down with your hands under your shoulders. Press up slowly, hips staying on the floor, and straighten your arms only as far as your lower back is comfortable.'),
  stretch('ex-knees-to-chest', 'Knees-to-Chest Stretch', ['Lower Back'], ['Glutes'], 'Lie on your back and hug both knees into your chest, letting your lower back relax into the floor. Rock gently from side to side if it feels good.'),
  stretch('ex-lying-spinal-twist', 'Lying Spinal Twist', ['Lower Back', 'Obliques'], ['Glutes', 'Chest'], 'Lie on your back with your arms out wide. Bring one knee up and across your body toward the floor while both shoulders stay down, and turn your head the other way. Switch sides for the next set.'),
  stretch('ex-seated-spinal-twist', 'Seated Spinal Twist', ['Obliques', 'Lower Back'], ['Glutes'], 'Sit with one leg straight and the other foot planted outside its knee. Sit tall, hug the bent knee with the opposite arm and turn your chest toward it, looking over your shoulder. Switch sides for the next set.'),
  stretch('ex-standing-side-bend', 'Standing Side Bend', ['Obliques', 'Lats'], [], 'Stand tall, feet hip-width apart, and reach one arm overhead. Lean your upper body to the other side, reaching up and over rather than down, without twisting. Switch sides for the next set.'),

  // ── Hips and glutes ─────────────────────────────────────────────────
  stretch('ex-kneeling-hip-flexor-stretch', 'Kneeling Hip Flexor Stretch', ['Hip Flexors'], ['Quadriceps'], 'Half-kneel with one knee on a pad and the other foot flat in front. Tuck your pelvis under, squeeze the glute of the back leg and shift forward until the front of that hip stretches; reach the same arm overhead to deepen it. Switch sides for the next set.'),
  stretch('ex-couch-stretch', 'Couch Stretch', ['Quadriceps', 'Hip Flexors'], [], 'Kneel with your back shin up against a wall or the back of a couch and the other foot planted in front. Squeeze the back leg\'s glute and lift your chest tall. It\'s intense: start with your hands on the front knee. Switch sides for the next set.'),
  stretch('ex-pigeon-pose', 'Pigeon Pose', ['Glutes'], ['Hip Flexors'], 'From all fours, bring one knee forward behind that wrist with the shin angled across your body, and stretch the other leg straight back. Keep your hips square and lower your chest over the front leg; a cushion under the hip helps if it doesn\'t reach the floor. Switch sides for the next set.'),
  stretch('ex-figure-four-stretch', 'Figure-4 Stretch', ['Glutes'], ['Lower Back'], 'Lie on your back with your knees bent. Cross one ankle over the other knee, then pull the bottom thigh toward your chest until the glute of the crossed leg stretches. Switch sides for the next set.'),
  stretch('ex-ninety-ninety-stretch', '90/90 Hip Stretch', ['Glutes'], ['Adductors', 'Hip Flexors'], 'Sit with your front leg bent 90° in front of you and your back leg bent 90° out to the side. Sit tall and lean your chest over the front shin. Swap the legs for the next set.'),
  stretch('ex-standing-outer-hip-stretch', 'Standing Outer Hip Stretch', ['Abductors'], ['Obliques'], 'Stand side-on to a wall with one hand on it. Cross the leg nearest the wall behind the other and push that hip out toward the wall until the outside of the hip stretches. Switch sides for the next set.'),
  stretch('ex-butterfly-stretch', 'Butterfly Stretch', ['Adductors'], [], 'Sit with the soles of your feet together and your knees dropping out to the sides. Hold your feet, sit tall and press your knees gently toward the floor with your elbows.'),
  stretch('ex-frog-stretch', 'Frog Stretch', ['Adductors'], ['Glutes'], 'On all fours, slide your knees out wide with your shins parallel and the insides of your feet on the floor. Rock your hips slowly back until the inner thighs stretch. Pad your knees.'),
  stretch('ex-side-lunge-stretch', 'Side Lunge Stretch', ['Adductors'], ['Hamstrings'], 'Stand with your feet wide. Bend one knee and sit back into that hip while the other leg stays straight with its toes pointing up; keep your chest up. Switch sides for the next set.'),
  stretch('ex-deep-squat-hold', 'Deep Squat Hold', ['Adductors', 'Glutes'], ['Calves', 'Lower Back'], 'Squat as low as you can with your heels down and your feet a little wider than your hips. Press your knees out with your elbows, palms together, chest up. Hold a post, or put small plates under your heels, if you tip back.'),
  stretch('ex-happy-baby', 'Happy Baby', ['Adductors', 'Hamstrings'], ['Lower Back'], 'Lie on your back, bring your knees toward your armpits and hold the outsides of your feet, soles facing the ceiling. Gently pull your knees down toward the floor and keep your lower back down.'),

  // ── Hamstrings, quads and calves ────────────────────────────────────
  stretch('ex-standing-hamstring-stretch', 'Standing Hamstring Stretch', ['Hamstrings'], ['Calves'], 'Put one heel on a low step or bench with the leg straight and the toes up. Keep your back flat and hinge forward from the hips until the back of the thigh stretches. Switch legs for the next set.'),
  stretch('ex-lying-hamstring-stretch', 'Lying Hamstring Stretch', ['Hamstrings'], ['Calves'], 'Lie on your back with a strap, towel or band around one foot. Raise that leg with the knee straight until you feel the stretch, the other leg flat on the floor. Switch legs for the next set.'),
  stretch('ex-seated-forward-fold', 'Seated Forward Fold', ['Hamstrings'], ['Lower Back', 'Calves'], 'Sit with your legs straight together and your toes up. Hinge forward from the hips and reach for your shins or feet, keeping your back long rather than rounding to reach further.'),
  stretch('ex-standing-forward-fold', 'Standing Forward Fold', ['Hamstrings', 'Lower Back'], ['Calves'], 'Stand with your feet hip-width apart and fold forward from the hips, letting your head and arms hang. Bend your knees as much as you need; hold your elbows for a little more weight.'),
  stretch('ex-standing-quad-stretch', 'Standing Quad Stretch', ['Quadriceps'], ['Hip Flexors'], 'Stand tall, holding a wall for balance. Bend one knee and hold that ankle behind you with your knees together, then tuck your hips under until the front of the thigh stretches. Switch legs for the next set.'),
  stretch('ex-standing-calf-stretch', 'Standing Calf Stretch', ['Calves'], [], 'Hands on a wall, step one foot back with the heel down and the knee straight, and lean forward until the calf stretches. Bend the back knee a little to move it to the lower calf. Switch legs for the next set.'),
  stretch('ex-downward-dog', 'Downward Dog', ['Hamstrings', 'Calves'], ['Lats', 'Shoulders'], 'From all fours, lift your hips up and back into an upside-down V. Press your heels toward the floor and your chest toward your thighs; bend your knees if your back rounds.'),

  // ── Whole body ──────────────────────────────────────────────────────
  stretch('ex-worlds-greatest-stretch', 'World\'s Greatest Stretch', ['Hip Flexors', 'Hamstrings'], ['Glutes', 'Upper Back', 'Adductors'], 'Step into a long lunge and put both hands down inside the front foot. Drop the elbow on that side toward the instep, then turn and reach that arm to the ceiling, following it with your eyes. Switch sides for the next set.'),
]
